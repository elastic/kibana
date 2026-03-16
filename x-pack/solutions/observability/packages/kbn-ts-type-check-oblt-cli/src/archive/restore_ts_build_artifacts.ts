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
  getCommitDistanceInfo,
  getPullRequestNumber,
  isCiEnvironment,
  logArtifactFreshness,
  readMainBranchCommitShas,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';

interface ArtifactsState {
  restoredSha: string;
}

export async function writeArtifactsState(sha: string): Promise<void> {
  const state: ArtifactsState = { restoredSha: sha };
  await Fs.promises.mkdir(Path.dirname(ARTIFACTS_STATE_FILE), { recursive: true });
  await Fs.promises.writeFile(ARTIFACTS_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Returns the commit SHA of the most-recently restored build artifact set, or
 * undefined if no restore has been performed (or the state file was deleted).
 */
export async function readArtifactsState(): Promise<ArtifactsState | undefined> {
  try {
    const raw = await Fs.promises.readFile(ARTIFACTS_STATE_FILE, 'utf8');
    return JSON.parse(raw) as ArtifactsState;
  } catch {
    return undefined;
  }
}

export async function restoreTSBuildArtifacts(log: SomeDevLog) {
  try {
    // If build artifacts already exist from a previous (possibly aborted) run,
    // skip the archive restore entirely. tsc's incremental build (-b) will
    // detect which projects are up-to-date and only rebuild what's needed —
    // which is faster than wiping everything and restoring from a cache archive.
    if (!isCiEnvironment()) {
      const hasExistingArtifacts = await checkForExistingBuildArtifacts();

      if (hasExistingArtifacts) {
        // If no state file exists (e.g. first run after this feature was added,
        // or after tmpdir was cleared), peek at the local cache to record the
        // best matching SHA so --only-detect-stale works without a full re-extract.
        if ((await readArtifactsState()) === undefined) {
          const [currentSha, history] = await Promise.all([
            resolveCurrentCommitSha(),
            readRecentCommitShas(MAX_COMMITS_TO_CHECK),
          ]);
          const candidateShas = buildCandidateShaList(currentSha, history);
          const bestSha = await new LocalFileSystem(log).findBestSha(candidateShas);
          if (bestSha) {
            await writeArtifactsState(bestSha);
          }
        }

        log.info(
          'Found existing type cache directories — skipping archive restore (tsc incremental build will handle it).'
        );
        return;
      }
    }

    log.info(`Restoring TypeScript build artifacts`);

    // The GCS bucket is public, so no auth token is needed for read operations.
    // Kick off all independent operations in parallel.
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
      // Bucket is public — no auth needed to restore on CI.
      const restoredSha = await new GcsFileSystem(log).restoreArchive(restoreOptions);
      if (restoredSha) {
        await writeArtifactsState(restoredSha);
      }
      return;
    }

    // Local development: bucket is public so always try GCS first, then fall
    // back to the local file-system cache.
    try {
      const gcsFs = new GcsFileSystem(log);

      if (!upstreamRemote) {
        log.warning(
          'Could not find a git remote for elastic/kibana. ' +
            'Add one with: git remote add upstream git@github.com:elastic/kibana.git'
        );
      }

      // Fetch upstream main and list GCS archives in parallel.
      // These are both network calls (~1-3s each) that don't depend on each other.
      const fetchUpstream = upstreamRemote
        ? execa('git', ['fetch', upstreamRemote, 'main', '--quiet'], { cwd: REPO_ROOT })
            .then(() => {
              log.verbose(`Fetched latest main from ${upstreamRemote}.`);
            })
            .catch((fetchError) => {
              const details = fetchError instanceof Error ? fetchError.message : String(fetchError);
              log.warning(`Failed to fetch ${upstreamRemote}/main: ${details}`);
            })
        : Promise.resolve();

      const gcsListPromise = gcsFs.listAvailableCommitShas();

      const [, availableShas] = await Promise.all([fetchUpstream, gcsListPromise]);

      if (availableShas.size === 0) {
        log.warning('GCS returned 0 archives. The bucket may be temporarily unavailable.');
      }

      // Read main branch SHAs (needs fetch to have completed).
      // CI archives artifacts under the commit SHA of each Buildkite build,
      // which is the HEAD of the PR branch (not the merge commit on main).
      // Therefore we search:
      //   1. HEAD history — includes commits CI built for the current branch
      //   2. upstream/main history — in case CI also archives main builds
      const mainShas = upstreamRemote
        ? await readMainBranchCommitShas(MAX_COMMITS_TO_CHECK, upstreamRemote)
        : [];
      const gcsCandidateShas = buildCandidateShaList(currentSha, [...history, ...mainShas]);

      const matchedShas = gcsCandidateShas.filter((sha) => availableShas.has(sha));

      if (matchedShas.length > 0) {
        const bestMatch = matchedShas[0];

        if (currentSha && bestMatch !== currentSha) {
          log.warning(
            `No CI artifacts available yet for HEAD (${currentSha.slice(0, 12)}). ` +
              `Falling back to the nearest ancestor with a cached archive (${bestMatch.slice(
                0,
                12
              )}). ` +
              `If type checking is slow, wait for CI to publish artifacts for HEAD and retry with --clean-cache --with-archive.`
          );
        }

        log.info(
          `Found ${
            matchedShas.length
          } matching archive(s) in GCS, restoring best match (${bestMatch.slice(0, 12)})...`
        );

        const gcsRestoreOptions = {
          ...restoreOptions,
          cacheInvalidationFiles: undefined,
          shas: matchedShas,
          skipExistenceCheck: true,
          skipClean: true,
        };

        // Run the informational freshness check concurrently with the
        // actual restore so the download starts immediately.
        const freshnessPromise = currentSha
          ? getCommitDistanceInfo(currentSha, bestMatch)
              .then((distanceInfo) => {
                if (distanceInfo) {
                  logArtifactFreshness(log, currentSha, bestMatch, distanceInfo);
                }
              })
              .catch(() => {})
          : Promise.resolve();

        const [restored] = await Promise.all([
          gcsFs.restoreArchive(gcsRestoreOptions),
          freshnessPromise,
        ]);

        if (restored) {
          await writeArtifactsState(restored);
          return;
        }
      } else if (availableShas.size > 0) {
        log.info(
          `None of the ${gcsCandidateShas.length} candidate commit(s) matched ` +
            `the ${availableShas.size} archived commit(s) in GCS.`
        );
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

    const localRestored = await new LocalFileSystem(log).restoreArchive({
      ...restoreOptions,
      cacheInvalidationFiles: undefined,
      skipClean: true,
    });

    if (localRestored) {
      await writeArtifactsState(localRestored);
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
async function checkForExistingBuildArtifacts(): Promise<boolean> {
  const configPathsFile = Path.resolve(REPO_ROOT, 'packages/kbn-ts-projects/config-paths.json');
  const raw = await Fs.promises.readFile(configPathsFile, 'utf8');
  const tsconfigPaths: string[] = JSON.parse(raw);

  const SAMPLE_SIZE = 10;
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

  return (await Promise.all(checks)).some(Boolean);
}
