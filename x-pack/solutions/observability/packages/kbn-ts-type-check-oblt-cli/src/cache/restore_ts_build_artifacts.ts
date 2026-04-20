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
import { CACHE_INVALIDATION_FILES, LOCAL_CACHE_ROOT, MAX_COMMITS_TO_CHECK } from './constants';
import { GcsFileSystem } from './file_system/gcs_file_system';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  cleanTypeCheckArtifacts,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';
import { isCacheServerAvailable, tryRestoreFromCacheServer } from './cache_server_client';
import { detectStaleArtifacts } from './detect_stale_artifacts';
import { buildReverseDependencyMap, computeEffectiveRebuildSet } from './dependency_graph';
import {
  writeArtifactsState,
  readArtifactsState,
  checkForExistingBuildArtifacts,
  invalidateTsBuildInfoFiles,
  getChangedInvalidationFiles,
} from './artifacts_state';
import {
  resolveBestGcsSha,
  PR_OVERHEAD,
  type GcsArchiveCandidates,
  type BestGcsArchive,
  resolveNonInvalidatedArchive,
  resolveGcsMatchedShas,
  computeEffectiveRebuildCountFromSha,
  estimatedTotalRebuildCount,
  logArchiveFallback,
} from './gcs_archive_resolver';

const STALE_RESTORE_THRESHOLD = 10;

/**
 * Selects the best archive from the two candidates returned by resolveBestGcsSha.
 *
 * Computes actual source staleness for each candidate (git diff of TypeScript
 * source files), then adds PR_OVERHEAD to the PR archive's cost. PR_OVERHEAD
 * is currently 0 — experiments showed no measurable inherent overhead from
 * PR archives vs commit archives at the same source-staleness level.
 *
 * Returns undefined when no valid archive exists.
 */
export async function selectBestArchive(
  candidates: GcsArchiveCandidates,
  tsProjects: TsProject[],
  log: SomeDevLog
): Promise<BestGcsArchive | undefined> {
  const { commitArchive, prArchive } = candidates;

  if (!commitArchive && !prArchive) return undefined;
  if (!commitArchive) return prArchive;
  if (!prArchive) return commitArchive;

  // Both candidates exist — compare using actual source staleness so we don't
  // blindly prefer the PR archive just because it's 1 commit more recent.
  const [commitStaleness, prStaleness] = await Promise.all([
    computeEffectiveRebuildCountFromSha(commitArchive.sha, tsProjects),
    computeEffectiveRebuildCountFromSha(prArchive.sha, tsProjects),
  ]);

  // Break the PR cost into its three components so the log is inspectable:
  //   source stale   — git diff of TypeScript source files
  //   graph overhead — packages added to project graph × STALENESS_WEIGHT
  //   PR overhead    — fixed cost for using any PR archive (currently 0; see PR_OVERHEAD)
  //
  // If the final "Rebuilt N project(s)" after a commit-archive run is close to
  // the "commit cost" shown here, the model is well-calibrated.
  const prGraphOverhead =
    (prArchive.projectGraphDiff?.added.length ?? 0) * 15; /* STALENESS_WEIGHT, sync if changed */
  const prSourceStale = prStaleness ?? 0;
  const prTotalCost =
    prStaleness !== undefined
      ? prSourceStale + prGraphOverhead + PR_OVERHEAD
      : Number.MAX_SAFE_INTEGER;
  const commitTotalCost =
    commitStaleness !== undefined
      ? estimatedTotalRebuildCount(commitArchive, commitStaleness)
      : Number.MAX_SAFE_INTEGER;

  log.info(
    `[Cache] Archive comparison — ` +
      `commit ${commitArchive.sha.slice(0, 12)}: ~${commitTotalCost} rebuilds` +
      (commitStaleness !== undefined
        ? ` (${commitStaleness} source-stale)`
        : ' (staleness unknown)') +
      ` | PR #${prArchive.prNumber} ${prArchive.sha.slice(0, 12)}: ~${prTotalCost} rebuilds` +
      (prStaleness !== undefined
        ? ` (${prSourceStale} source-stale + ${prGraphOverhead} graph + ${PR_OVERHEAD} PR overhead)`
        : ' (staleness unknown)')
  );

  if (prTotalCost < commitTotalCost) {
    log.info(`[Cache] → PR archive selected (lower estimated cost).`);
    return prArchive;
  }

  log.info(`[Cache] → Commit archive selected ` + `(commit archive has lower estimated cost).`);
  return commitArchive;
}

export type RestoreStrategy =
  | {
      shouldRestore: true;
      bestSha: string;
      staleProjects: string[];
      prNumber?: string;
      /** PR branch tip SHA; only set for PR archives. Passed to restoreArchive as
       *  the shas lookup key (must match metadata.json's commitSha). bestSha is the
       *  main-branch merge commit and is used for the state file and git operations. */
      prTipSha?: string;
      /** Whether the local cache server was reachable when the strategy was resolved.
       *  When false, restoreTSBuildArtifacts should skip the cache server attempt and
       *  restore directly from GCS. */
      cacheServerAvailable: boolean;
    }
  | { shouldRestore: false; bestSha?: undefined };

/**
 * Converts absolute tsconfig.type_check.json paths (as produced by detectStaleArtifacts /
 * computeEffectiveRebuildSet) to the relative tsconfig.json paths that the cache server
 * stores in its index. E.g.:
 *   /abs/path/kibana/packages/foo/tsconfig.type_check.json → packages/foo/tsconfig.json
 */
function toServerProjectPaths(absoluteTypeCheckPaths: string[]): string[] {
  return absoluteTypeCheckPaths.map((absPath) => {
    const rel = Path.relative(REPO_ROOT, absPath);
    return rel.replace(/tsconfig\.type_check\.json$/, 'tsconfig.json');
  });
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

  // Phase 1: fast local checks + cache server availability probe run in parallel.
  // isCacheServerAvailable() fails immediately on ECONNREFUSED so there is no
  // meaningful latency cost even when the server is not running.
  const [hasLocalArtifacts, localStateSha, currentSha, cacheServerAvailable] = await Promise.all([
    checkForExistingBuildArtifacts(),
    readArtifactsState(),
    resolveCurrentCommitSha(),
    isCacheServerAvailable(),
  ]);

  if (!hasLocalArtifacts) {
    log.info('[Cache check] No local artifacts found — will restore from cache.');

    if (!cacheServerAvailable) {
      log.info('[Cache] Cache server unavailable — will restore directly from GCS.');
    }

    const bestArchive = await selectBestArchive(
      await resolveBestGcsSha(log, gcsFs, currentSha, cacheServerAvailable),
      tsProjects,
      log
    );

    if (!bestArchive) {
      log.info('[Cache check] No GCS archive available — tsc will build from scratch.');
      return { shouldRestore: false };
    }

    const validArchive = await resolveNonInvalidatedArchive(bestArchive, log);
    if (!validArchive) {
      return { shouldRestore: false };
    }

    const effectiveRebuildCount = await computeEffectiveRebuildCountFromSha(
      validArchive.sha,
      tsProjects
    );
    const adjustedRebuildCount =
      effectiveRebuildCount !== undefined
        ? estimatedTotalRebuildCount(validArchive, effectiveRebuildCount)
        : undefined;
    await logArchiveFallback(log, currentSha, validArchive, adjustedRebuildCount);
    return {
      shouldRestore: true,
      bestSha: validArchive.sha,
      prNumber: validArchive.prNumber,
      prTipSha: validArchive.prTipSha,
      staleProjects: [],
      cacheServerAvailable,
    };
  }

  if (!localStateSha) {
    // Local artifacts exist but we have no record of what commit they correspond to
    // (e.g. first run after adding this tool, or state file was deleted). Treat
    // as unknown freshness and restore from GCS so we start from a known baseline.
    log.info('[Cache check] Local artifact state unknown — will restore from cache.');

    if (!cacheServerAvailable) {
      log.info('[Cache] Cache server unavailable — will restore directly from GCS.');
    }

    const bestArchive = await selectBestArchive(
      await resolveBestGcsSha(log, gcsFs, currentSha, cacheServerAvailable),
      tsProjects,
      log
    );

    if (!bestArchive) {
      log.info('[Cache check] No GCS archive available — tsc will handle staleness incrementally.');
      return { shouldRestore: false };
    }

    const validArchive = await resolveNonInvalidatedArchive(bestArchive, log);
    if (!validArchive) {
      return { shouldRestore: false };
    }

    const effectiveRebuildCount = await computeEffectiveRebuildCountFromSha(
      validArchive.sha,
      tsProjects
    );
    const adjustedRebuildCount =
      effectiveRebuildCount !== undefined
        ? estimatedTotalRebuildCount(validArchive, effectiveRebuildCount)
        : undefined;
    await logArchiveFallback(log, currentSha, validArchive, adjustedRebuildCount);
    return {
      shouldRestore: true,
      bestSha: validArchive.sha,
      prNumber: validArchive.prNumber,
      prTipSha: validArchive.prTipSha,
      staleProjects: [],
      cacheServerAvailable,
    };
  }

  // Phase 1.5: cache-invalidation file check — git diff, no network I/O.
  // Changes to yarn.lock, .nvmrc, or .node-version mean node_modules may have
  // changed since the local artifacts were built. tsc's .tsbuildinfo incremental
  // check compares the hashes of dependency .d.ts outputs in target/types — if
  // those outputs are still from the old node_modules version, tsc considers
  // downstream projects "up-to-date" without rechecking them, silently masking
  // type errors (e.g. Zod v3 → v4 API incompatibilities).
  // When invalidation files changed, wipe the local artifacts, then check if GCS
  // has an archive built *after* the invalidating change (which would be safe to
  // restore). If not, tsc rebuilds everything from scratch.
  const changedInvalidationFiles = await getChangedInvalidationFiles(localStateSha);
  if (changedInvalidationFiles === undefined || changedInvalidationFiles.length > 0) {
    if (changedInvalidationFiles === undefined) {
      log.warning(
        `[Cache check] Could not verify cache-invalidation files since ${localStateSha.slice(
          0,
          12
        )} (git error) — treating as unknown, will restore from cache.`
      );
    } else {
      log.warning(
        `[Cache check] Cache-invalidation file(s) changed since ${localStateSha.slice(0, 12)}: ` +
          `${changedInvalidationFiles.join(', ')}. ` +
          `Local artifacts may be stale — cleaning them.`
      );
    }
    if (changedInvalidationFiles?.includes('yarn.lock')) {
      log.warning(
        '[Bootstrap] yarn.lock changed — if you recently switched branches, ' +
          'run: yarn kbn bootstrap'
      );
    }

    if (!cacheServerAvailable) {
      log.info('[Cache] Cache server unavailable — will restore directly from GCS.');
    }

    await cleanTypeCheckArtifacts(log);
    await writeArtifactsState('');

    const bestArchive = await selectBestArchive(
      await resolveBestGcsSha(log, gcsFs, currentSha, cacheServerAvailable),
      tsProjects,
      log
    );

    if (!bestArchive) {
      log.info('[Cache check] No GCS archive available — tsc will build from scratch.');
      return { shouldRestore: false };
    }

    const validArchive = await resolveNonInvalidatedArchive(bestArchive, log);
    if (!validArchive) {
      log.info('[Cache check] GCS archive also predates the change — tsc will build from scratch.');
      return { shouldRestore: false };
    }

    const effectiveRebuildCount = await computeEffectiveRebuildCountFromSha(
      validArchive.sha,
      tsProjects
    );
    const adjustedRebuildCount =
      effectiveRebuildCount !== undefined
        ? estimatedTotalRebuildCount(validArchive, effectiveRebuildCount)
        : undefined;
    await logArchiveFallback(log, currentSha, validArchive, adjustedRebuildCount);
    log.info(
      `[Cache check] Found compatible GCS archive at ${validArchive.sha.slice(
        0,
        12
      )} — will restore.`
    );
    return {
      shouldRestore: true,
      bestSha: validArchive.sha,
      prNumber: validArchive.prNumber,
      prTipSha: validArchive.prTipSha,
      staleProjects: [],
      cacheServerAvailable,
    };
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
      `[Cache check] ✓ Cache freshness is good${
        effectiveRebuildSet.size === 1
          ? ' — only one project needs rebuilding'
          : effectiveRebuildSet.size > 1
          ? ` — only ${effectiveRebuildSet.size} projects need rechecking`
          : ' — no projects need rechecking'
      }`
    );
    // Invalidate .tsbuildinfo for stale projects so tsc is forced to recheck
    // them. Without this, tsc may treat a project as "up-to-date" if its source
    // file hashes match a historical successful build, even when the code is
    // now invalid (e.g. a dependency's API changed in the same zod package version).
    await invalidateTsBuildInfoFiles(effectiveRebuildSet, log);
    return { shouldRestore: false, bestSha: undefined };
  }

  // Phase 3: check whether a GCS restore would actually reduce the rebuild count.
  const bestGcsArchive = await selectBestArchive(
    await resolveBestGcsSha(log, gcsFs, currentSha, cacheServerAvailable),
    tsProjects,
    log
  );

  if (!bestGcsArchive) {
    log.info(
      `[Cache check] No GCS archive found — tsc will rebuild ${effectiveRebuildSet.size} project(s) ` +
        `from local artifacts. This is normal after a branch switch or merge.`
    );
    await invalidateTsBuildInfoFiles(effectiveRebuildSet, log);
    return { shouldRestore: false };
  }

  // Discard the archive if it was built against a different node_modules.
  // If the top pick is a PR archive with a newer yarn.lock, fall back to the
  // best commit archive (which shares the same yarn.lock as HEAD).
  const validGcsArchive = await resolveNonInvalidatedArchive(bestGcsArchive, log);

  if (!validGcsArchive) {
    log.info('[Cache check] Skipping restore — tsc will rebuild locally with current artifacts.');
    await invalidateTsBuildInfoFiles(effectiveRebuildSet, log);
    return { shouldRestore: false };
  }

  // Second git diff: how many projects are stale relative to the GCS archive SHA?
  // This is a cheap local operation — no download involved.
  let gcsEffectiveCount: number;

  try {
    const gcsStale = await detectStaleArtifacts({
      fromCommit: validGcsArchive.sha,
      toCommit: 'HEAD',
      sourceConfigPaths: tsProjects.map((p) => p.path),
    });

    gcsEffectiveCount = computeEffectiveRebuildSet(gcsStale, reverseDeps).size;
  } catch {
    // If the GCS SHA is not in local git history we can't compare; assume the
    // restore is beneficial and proceed.
    gcsEffectiveCount = 0;
  }

  // Add project-graph staleness overhead for PR archives. Each package added
  // to the project graph since the archive was built requires fresh compilation
  // on first restore. This ensures we don't restore an archive whose graph-diff
  // rebuild cost exceeds the local rebuild cost.
  const gcsAdjustedCount = estimatedTotalRebuildCount(validGcsArchive, gcsEffectiveCount);

  if (gcsAdjustedCount < effectiveRebuildSet.size) {
    await logArchiveFallback(log, currentSha, validGcsArchive, gcsAdjustedCount);
    log.info(
      `[Cache check] Having archive for ${validGcsArchive.sha.slice(
        0,
        12
      )} would reduce rebuild count ` +
        `from ${effectiveRebuildSet.size} to ${gcsAdjustedCount} — will restore.`
    );

    const staleProjects = validGcsArchive.prNumber
      ? [] // cache server indexes by commit SHA — skip selective restore for PR archives
      : toServerProjectPaths([...effectiveRebuildSet]);

    return {
      shouldRestore: true,
      bestSha: validGcsArchive.sha,
      prNumber: validGcsArchive.prNumber,
      prTipSha: validGcsArchive.prTipSha,
      staleProjects,
      cacheServerAvailable,
    };
  }

  log.info(
    `[Cache check] ✓ GCS archive (${validGcsArchive.sha.slice(
      0,
      12
    )}) would not reduce the rebuild ` +
      `count (${gcsAdjustedCount} vs ${effectiveRebuildSet.size} locally) — skipping restore.`
  );
  log.info(
    `[Cache check] tsc will rebuild ${effectiveRebuildSet.size} project(s) incrementally ` +
      `from local artifacts. This is normal after a branch switch or merge — ` +
      `run the type check once and subsequent runs will be fast.`
  );

  // GCS restore would not help, but we still need to ensure tsc rechecks the
  // stale projects. Invalidate their .tsbuildinfo files so tsc cannot treat
  // them as up-to-date based on a historical (possibly incorrect) build.
  await invalidateTsBuildInfoFiles(effectiveRebuildSet, log);

  return { shouldRestore: false, bestSha: undefined };
}

/**
 * Restores TypeScript build artifacts from GCS (or local cache as fallback).
 *
 * @param specificSha When provided (local smart restore path), skips discovery
 *   and extracts the archive for that exact SHA directly. When omitted (CI path
 *   or --restore-artifacts), runs a full candidate search to find the best match.
 * @param options.skipExistingArtifactsCheck When true, do not short-circuit on
 *   existing target/types (use for explicit --restore-artifacts so a partially
 *   warm cache does not turn the restore into a no-op).
 */
export async function restoreTSBuildArtifacts(
  log: SomeDevLog,
  specificSha?: string,
  options: {
    skipExistingArtifactsCheck?: boolean;
    staleProjects?: string[];
    /** When set, restore from prs/<prNumber>/ instead of commits/<sha>/. */
    prNumber?: string;
    /** PR branch tip SHA used as the shas lookup key in restoreArchive.
     *  Only set when prNumber is also set. specificSha (the main-branch merge commit)
     *  is still used for the state file — it is guaranteed to be in local git. */
    prTipSha?: string;
    /** When true, skip the cache server entirely and restore directly from GCS.
     *  Set by the caller when isCacheServerAvailable() already returned false so
     *  we avoid a redundant network probe that would produce a confusing late error. */
    skipCacheServer?: boolean;
  } = {}
) {
  try {
    if (specificSha) {
      // Direct restore — SHA already determined by resolveRestoreStrategy.
      // Skip cache server for PR archives (server indexes by commit SHA, not PR).
      // Also skip if the caller already determined the server is unavailable.
      const fromServer =
        options.prNumber || options.skipCacheServer
          ? false
          : await tryRestoreFromCacheServer(log, specificSha, options.staleProjects);

      if (fromServer) {
        await writeArtifactsState(specificSha);

        return;
      }

      const gcsFs = new GcsFileSystem(log);

      await gcsFs.restoreArchive({
        shas: [options.prTipSha ?? specificSha],
        prNumber: options.prNumber,
        skipExistenceCheck: true,
      });

      await writeArtifactsState(specificSha);

      return;
    }

    // Full discovery path: used by --restore-artifacts and CI.
    log.info('[Cache] Restoring artifacts...');

    // Skip if artifacts already exist locally (only when not explicitly
    // pre-populating: --restore-artifacts passes skipExistingArtifactsCheck so
    // a single prior --project run does not turn restore into a no-op).
    if (!isCiEnvironment() && !options.skipExistingArtifactsCheck) {
      const hasExistingArtifacts = await checkForExistingBuildArtifacts();

      if (hasExistingArtifacts) {
        log.info(
          '[Cache] Found existing artifacts — skipping restore (tsc incremental build will handle staleness).'
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
      log.info('[Cache] No commit history available for cache restore.');
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
          `[Cache] Found ${
            matchedShas.length
          } matching archive(s) in GCS, restoring best match (${bestMatch.slice(0, 12)})...`
        );

        const fromServer = await tryRestoreFromCacheServer(log, bestMatch);

        if (fromServer) {
          await writeArtifactsState(bestMatch);

          return;
        }

        const restored = await gcsFs.restoreArchive({
          ...restoreOptions,
          cacheInvalidationFiles: undefined,
          shas: matchedShas,
          skipExistenceCheck: true,
          skipClean: true,
        });

        if (restored) {
          await writeArtifactsState(restored);

          return;
        }
      }

      log.info('[Cache] Falling back to local cache.');
    } catch (gcsError) {
      const gcsErrorDetails = gcsError instanceof Error ? gcsError.message : String(gcsError);
      log.warning(`[Cache] GCS restore failed (${gcsErrorDetails}), falling back to local cache.`);
    }

    try {
      await Fs.promises.access(LOCAL_CACHE_ROOT);
    } catch {
      log.info('[Cache] No local cache exists yet — it will be populated after this type check.');
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
    log.warning(`[Cache] Failed to restore artifacts: ${restoreErrorDetails}`);
  }
}
