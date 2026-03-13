/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import execa from 'execa';
import {
  ARTIFACTS_STATE_FILE,
  CACHE_INVALIDATION_FILES,
  LOCAL_CACHE_ROOT,
  MAX_COMMITS_TO_CHECK,
} from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getPullRequestNumber,
  isCiEnvironment,
  readMainBranchCommitShas,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';
import { detectStaleArtifacts } from './detect_stale_artifacts';

const STALE_RESTORE_THRESHOLD = 10;

/**
 * Writes the given commit SHA to the per-clone state file, recording what
 * commit the local TypeScript build artifacts currently correspond to.
 * Called after a GCS restore and after each successful tsc run.
 */
export async function writeArtifactsState(sha: string): Promise<void> {
  await Fs.promises.mkdir(Path.dirname(ARTIFACTS_STATE_FILE), { recursive: true });
  await Fs.promises.writeFile(ARTIFACTS_STATE_FILE, sha, 'utf8');
}

/**
 * Returns the commit SHA the local artifacts currently correspond to, or
 * undefined if no state has been recorded yet (e.g. first run, or the file
 * was deleted alongside the artifacts).
 */
export async function readArtifactsState(): Promise<string | undefined> {
  try {
    const sha = (await Fs.promises.readFile(ARTIFACTS_STATE_FILE, 'utf8')).trim();
    return sha.length > 0 ? sha : undefined;
  } catch {
    return undefined;
  }
}

export type RestoreStrategy =
  | { shouldRestore: true; bestSha: string }
  | { shouldRestore: false; bestSha?: undefined };

/**
 * Fetches upstream, lists available GCS archive SHAs, and returns the subset
 * of local git candidates that have a matching archive — ordered most to least
 * recent. Shared by resolveBestGcsSha and the full-discovery restore path so
 * the matching logic stays in one place.
 */
async function resolveGcsMatchedShas(
  log: SomeDevLog,
  gcsFs: GcsFileSystem,
  currentSha: string | undefined,
  history: string[],
  upstreamRemote: string | undefined
): Promise<string[]> {
  const fetchUpstream = upstreamRemote
    ? execa('git', ['fetch', upstreamRemote, 'main', '--quiet'], { cwd: REPO_ROOT })
        .then(() => log.verbose(`Fetched latest main from ${upstreamRemote}.`))
        .catch((err: unknown) => {
          log.warning(
            `Failed to fetch ${upstreamRemote}/main: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        })
    : Promise.resolve();

  const [availableShas] = await Promise.all([gcsFs.listAvailableCommitShas(), fetchUpstream]);

  if (availableShas.size === 0) {
    log.warning('GCS returned 0 archives. The bucket may be temporarily unavailable.');
  }

  const mainShas = upstreamRemote
    ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK, upstreamRemote)
    : [];

  const candidates = buildCandidateShaList(currentSha, [...history, ...mainShas]);
  const matched = candidates.filter((sha) => availableShas.has(sha));

  if (matched.length === 0 && candidates.length > 0 && availableShas.size > 0) {
    log.info(
      `None of the ${candidates.length} candidate commit(s) matched ` +
        `the ${availableShas.size} archived commit(s) in GCS.`
    );
  }

  return matched;
}

/**
 * Finds the closest available GCS archive SHA for the current checkout.
 * Called when the local effective rebuild count exceeds the threshold, to
 * check whether a GCS archive would actually reduce the work before downloading.
 */
async function resolveBestGcsSha(
  log: SomeDevLog,
  gcsFs: GcsFileSystem
): Promise<string | undefined> {
  const upstreamRemote = await resolveUpstreamRemote();
  const [currentSha, history] = await Promise.all([
    resolveCurrentCommitSha(),
    readRecentCommitShas(MAX_COMMITS_TO_CHECK),
  ]);
  const matched = await resolveGcsMatchedShas(log, gcsFs, currentSha, history, upstreamRemote);
  return matched[0];
}

/**
 * Determines whether TypeScript build artifacts should be restored from GCS
 * before running the type check.
 *
 * Uses a three-phase approach to avoid unnecessary GCS work:
 *
 * Phase 1 (fast, local-only): checks whether local artifacts exist and reads
 *   the state file that records what commit they correspond to. If artifacts
 *   are missing or their state is unknown, we immediately decide to restore.
 *
 * Phase 2 (git-based, still local): computes the effective rebuild set — stale
 *   projects plus all their transitive dependents via BFS. A foundational stale
 *   package can cascade into hundreds of dependent rebuilds, so raw stale count
 *   is a poor signal; effective rebuild count is the correct metric.
 *   If the count is within the threshold, no restore is needed.
 *
 * Phase 3 (GCS lookup + second git diff): only reached when the local effective
 *   rebuild count exceeds the threshold. Finds the best available GCS archive
 *   SHA, then runs a second git diff from that SHA to HEAD to compute how many
 *   projects would still be stale after a restore. The restore only happens if
 *   the GCS archive genuinely reduces the rebuild count — this avoids a wasteful
 *   ~2 min download when the user intentionally changed a foundational package
 *   and the GCS archive is just as stale.
 */
export async function resolveRestoreStrategy(
  log: SomeDevLog,
  tsProjects: TsProject[]
): Promise<RestoreStrategy> {
  const gcsFs = new GcsFileSystem(log);

  // Phase 1: fast local checks — no network I/O.
  const [hasLocalArtifacts, localStateSha] = await Promise.all([
    checkForExistingBuildArtifacts(),
    readArtifactsState(),
  ]);

  if (!hasLocalArtifacts) {
    log.info('[Cache check] No local TypeScript artifacts found — will restore from GCS.');
    const bestSha = await resolveBestGcsSha(log, gcsFs);
    if (!bestSha) {
      log.info('[Cache check] No GCS archive available — tsc will build from scratch.');
      return { shouldRestore: false };
    }
    return { shouldRestore: true, bestSha };
  }

  if (!localStateSha) {
    // Local artifacts exist but we have no record of what commit they correspond to
    // (e.g. first run after adding this tool, or state file was deleted). Treat
    // as unknown freshness and restore from GCS so we start from a known baseline.
    log.info(
      '[Cache check] Local artifacts found but their state is unknown — will restore from GCS.'
    );
    const bestSha = await resolveBestGcsSha(log, gcsFs);
    if (!bestSha) {
      log.info('[Cache check] No GCS archive available — tsc will handle staleness incrementally.');
      return { shouldRestore: false };
    }
    return { shouldRestore: true, bestSha };
  }

  // Phase 2: staleness check — git diff, no network I/O.
  // Staleness is computed from the local state SHA (what the artifacts on disk
  // actually correspond to) — NOT the GCS ancestor. Using the GCS ancestor would
  // undercount stale projects when local artifacts are older than the GCS archive.
  const stale = await detectStaleArtifacts({
    fromCommit: localStateSha,
    toCommit: 'HEAD',
    sourceConfigPaths: tsProjects.map((p) => p.path),
  });

  if (stale.size === 0) {
    log.info(
      `[Cache check] ✓ All artifacts are up-to-date — no committed changes since ${localStateSha.slice(
        0,
        12
      )}.`
    );
    return { shouldRestore: false, bestSha: undefined };
  }

  const reverseDeps = buildReverseDependencyMap(tsProjects);
  const effectiveRebuildSet = computeEffectiveRebuildSet(stale, reverseDeps);
  const shortSha = localStateSha.slice(0, 12);

  log.info(
    `[Cache check] ${stale.size} stale project(s) affect ${effectiveRebuildSet.size} project(s) ` +
      `in total (including dependents) since ${shortSha}.`
  );

  if (effectiveRebuildSet.size <= STALE_RESTORE_THRESHOLD) {
    log.info(
      `[Cache check] ✓ Cache freshness is good — only ${effectiveRebuildSet.size} project(s) ` +
        `need rebuilding.`
    );
    return { shouldRestore: false, bestSha: undefined };
  }

  // Phase 3: check whether a GCS restore would actually reduce the rebuild count.
  const bestGcsSha = await resolveBestGcsSha(log, gcsFs);

  if (!bestGcsSha) {
    log.info(
      `[Cache check] No GCS archive found — proceeding with ${effectiveRebuildSet.size} local rebuilds.`
    );
    return { shouldRestore: false };
  }

  // Second git diff: how many projects are stale relative to the GCS archive SHA?
  // This is a cheap local operation — no download involved.
  let gcsEffectiveCount: number;
  try {
    const gcsStale = await detectStaleArtifacts({
      fromCommit: bestGcsSha,
      toCommit: 'HEAD',
      sourceConfigPaths: tsProjects.map((p) => p.path),
    });
    gcsEffectiveCount = computeEffectiveRebuildSet(gcsStale, reverseDeps).size;
  } catch {
    // If the GCS SHA is not in local git history we can't compare; assume the
    // restore is beneficial and proceed.
    gcsEffectiveCount = 0;
  }

  if (gcsEffectiveCount < effectiveRebuildSet.size) {
    log.info(
      `[Cache check] GCS archive (${bestGcsSha.slice(0, 12)}) reduces rebuild count ` +
        `from ${effectiveRebuildSet.size} to ${gcsEffectiveCount} — will restore.`
    );
    return { shouldRestore: true, bestSha: bestGcsSha };
  }

  log.info(
    `[Cache check] ✓ GCS archive (${bestGcsSha.slice(0, 12)}) would not reduce the rebuild ` +
      `count (${gcsEffectiveCount} vs ${effectiveRebuildSet.size} locally) — skipping restore.`
  );
  return { shouldRestore: false, bestSha: undefined };
}

function buildReverseDependencyMap(tsProjects: TsProject[]): Map<string, Set<string>> {
  const reverseDeps = new Map<string, Set<string>>();

  for (const project of tsProjects) {
    for (const dep of project.getKbnRefs(tsProjects)) {
      const depPath = dep.typeCheckConfigPath;
      if (!reverseDeps.has(depPath)) {
        reverseDeps.set(depPath, new Set());
      }
      reverseDeps.get(depPath)!.add(project.typeCheckConfigPath);
    }
  }

  return reverseDeps;
}

/**
 * Computes the union of directly stale projects and all their transitive
 * dependents via BFS over the reverse dependency graph. This is the true
 * number of projects tsc would need to recheck if the stale artifacts are
 * used as-is.
 */
export function computeEffectiveRebuildSet(
  stale: Set<string>,
  reverseDeps: Map<string, Set<string>>
): Set<string> {
  const result = new Set(stale);
  const queue = [...stale];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of reverseDeps.get(current) ?? []) {
      if (!result.has(dependent)) {
        result.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return result;
}

/**
 * Restores TypeScript build artifacts from GCS (or local cache as fallback).
 *
 * @param specificSha When provided (local smart restore path), skips discovery
 *   and extracts the archive for that exact SHA directly. When omitted (CI path
 *   or --restore-artifacts), runs a full candidate search to find the best match.
 */
export async function restoreTSBuildArtifacts(log: SomeDevLog, specificSha?: string) {
  try {
    if (specificSha) {
      // Direct restore — SHA already determined by resolveRestoreStrategy.
      // Existing artifacts are cleaned as part of the extraction.
      log.info(`Restoring TypeScript build artifacts (${specificSha.slice(0, 12)})...`);
      const gcsFs = new GcsFileSystem(log);
      const prNumber = getPullRequestNumber();
      await gcsFs.restoreArchive({
        shas: [specificSha],
        prNumber,
        skipExistenceCheck: true,
      });
      // Record the SHA so subsequent runs can accurately assess staleness.
      await writeArtifactsState(specificSha);
      return;
    }

    // Full discovery path: used by --restore-artifacts and CI.
    log.info('Restoring TypeScript build artifacts');

    // Skip if artifacts already exist locally (only relevant for --restore-artifacts;
    // the smart restore path never reaches here with artifacts already on disk).
    if (!isCiEnvironment()) {
      const hasExistingArtifacts = await checkForExistingBuildArtifacts();
      if (hasExistingArtifacts) {
        log.info(
          'Found existing type cache directories — skipping archive restore (tsc incremental build will handle it).'
        );
        return;
      }
    }

    const [currentSha, history, upstreamRemote] = await Promise.all([
      resolveCurrentCommitSha(),
      readRecentCommitShas(MAX_COMMITS_TO_CHECK),
      resolveUpstreamRemote(),
    ]);

    const candidateShas = buildCandidateShaList(currentSha, history);

    if (candidateShas.length === 0) {
      log.info('No commit history available for TypeScript cache restore.');
      return;
    }

    const prNumber = getPullRequestNumber();
    const restoreOptions = {
      shas: candidateShas,
      prNumber,
      cacheInvalidationFiles: CACHE_INVALIDATION_FILES,
    };

    if (isCiEnvironment()) {
      await new GcsFileSystem(log).restoreArchive(restoreOptions);
      return;
    }

    // Local: try GCS first, fall back to local cache.
    try {
      const gcsFs = new GcsFileSystem(log);

      if (!upstreamRemote) {
        log.warning(
          'Could not find a git remote for elastic/kibana. ' +
            'Add one with: git remote add upstream git@github.com:elastic/kibana.git'
        );
      }

      const matchedShas = await resolveGcsMatchedShas(
        log,
        gcsFs,
        currentSha,
        history,
        upstreamRemote
      );

      if (matchedShas.length > 0) {
        const bestMatch = matchedShas[0];

        if (currentSha && bestMatch !== currentSha) {
          log.warning(
            `No CI artifacts available yet for HEAD (${currentSha.slice(0, 12)}). ` +
              `Falling back to the nearest ancestor with a cached archive (${bestMatch.slice(
                0,
                12
              )}).`
          );
        }

        log.info(
          `Found ${
            matchedShas.length
          } matching archive(s) in GCS, restoring best match (${bestMatch.slice(0, 12)})...`
        );

        const restored = await gcsFs.restoreArchive({
          ...restoreOptions,
          cacheInvalidationFiles: undefined,
          shas: matchedShas,
          skipExistenceCheck: true,
          skipClean: true,
        });

        if (restored) {
          // Record the restored SHA so subsequent runs accurately assess
          // staleness rather than treating the artifacts as unknown state.
          await writeArtifactsState(restored);
          return;
        }
      }

      log.info('Falling back to local cache.');
    } catch (gcsError) {
      const gcsErrorDetails = gcsError instanceof Error ? gcsError.message : String(gcsError);
      log.warning(`GCS restore failed (${gcsErrorDetails}), falling back to local cache.`);
    }

    try {
      await Fs.promises.access(LOCAL_CACHE_ROOT);
    } catch {
      log.info('No local cache exists yet. It will be populated after this type check completes.');
      return;
    }

    const restored = await new LocalFileSystem(log).restoreArchive({
      ...restoreOptions,
      cacheInvalidationFiles: undefined,
      skipClean: true,
    });

    if (restored) {
      await writeArtifactsState(restored);
    }
  } catch (error) {
    const restoreErrorDetails = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to restore TypeScript build artifacts: ${restoreErrorDetails}`);
  }
}

/**
 * Spot-checks a sample of known TS project paths for existing `target/types`
 * directories. Uses the static `config-paths.json` (which lists every
 * tsconfig.json in the repo) instead of a filesystem glob — this avoids
 * scanning `node_modules` and is effectively instant.
 */
export async function checkForExistingBuildArtifacts(): Promise<boolean> {
  const configPathsFile = Path.resolve(REPO_ROOT, 'packages/kbn-ts-projects/config-paths.json');
  const raw = await Fs.promises.readFile(configPathsFile, 'utf8');
  const tsconfigPaths: string[] = JSON.parse(raw);

  const SAMPLE_SIZE = 30;
  const step = Math.max(1, Math.floor(tsconfigPaths.length / SAMPLE_SIZE));
  const sample = tsconfigPaths.filter((_, i) => i % step === 0).slice(0, SAMPLE_SIZE);

  const checks = sample.map(async (tsconfigRel) => {
    const projectDir = Path.dirname(Path.resolve(REPO_ROOT, tsconfigRel));
    try {
      await Fs.promises.access(Path.join(projectDir, 'target', 'types'));
      return true;
    } catch {
      return false;
    }
  });

  // `some(Boolean)` is intentionally conservative: a single sampled project
  // having a target/types directory is enough to conclude artifacts exist. This
  // can produce a false positive if the developer previously ran only a partial
  // type check, but Phase 2's state-SHA comparison corrects for that — if the
  // sampled project's artifacts are from a different commit, the effective
  // rebuild count will reflect that and trigger a fresh GCS restore if needed.
  return (await Promise.all(checks)).some(Boolean);
}
