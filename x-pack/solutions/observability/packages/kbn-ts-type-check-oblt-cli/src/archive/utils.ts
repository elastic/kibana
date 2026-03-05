/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import Path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { asyncForEachWithLimit } from '@kbn/std';
import {
  CACHE_IGNORE_GLOBS,
  GCLOUD_ACTIVATE_SCRIPT,
  GCS_BUCKET_NAME,
  LOCAL_CACHE_ROOT,
  TYPES_DIRECTORY_GLOB,
  TYPE_CHECK_CONFIG_GLOB,
} from './constants';
export type { ArchiveMetadata, PullRequestArchiveMetadata } from './file_system/types';

export const getPullRequestNumber = (): string | undefined => {
  const value = process.env.BUILDKITE_PULL_REQUEST ?? '';
  if (value.length === 0 || value === 'false') {
    return undefined;
  }

  return value;
};

export async function resolveCurrentCommitSha(): Promise<string | undefined> {
  if (process.env.BUILDKITE_COMMIT) {
    return process.env.BUILDKITE_COMMIT;
  }

  const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
  const sha = stdout.trim();
  return sha.length > 0 ? sha : undefined;
}

export async function readRecentCommitShas(limit: number): Promise<string[]> {
  const { stdout } = await execa('git', ['rev-list', '--max-count', String(limit), 'HEAD'], {
    cwd: REPO_ROOT,
  });
  return stdout
    .split('\n')
    .map((sha: string) => sha.trim())
    .filter((sha: string) => sha.length > 0);
}

/**
 * Find the git remote name that points to the elastic/kibana repo.
 * Engineers typically work on forks where `origin` is their personal fork,
 * and the upstream elastic/kibana repo is configured under a different remote
 * name (commonly `upstream` or `elastic`).
 *
 * Checks remote URLs for `elastic/kibana` (supports HTTPS and SSH patterns).
 * Returns the remote name, or undefined if not found.
 */
export async function resolveUpstreamRemote(): Promise<string | undefined> {
  try {
    const { stdout } = await execa('git', ['remote', '-v'], { cwd: REPO_ROOT });

    for (const line of stdout.split('\n')) {
      const match = line.match(/^(\S+)\s+\S*elastic\/kibana(?:\.git)?\s/);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read recent commit SHAs from the upstream main branch.
 * Finds the remote that points to elastic/kibana (could be `upstream`, `elastic`,
 * `origin`, etc.) and reads commits from `<remote>/main`.
 * These are the commits most likely to have archived artifacts in GCS.
 * Returns an empty array if no suitable remote is found.
 */
export async function readMainBranchCommitShas(limit: number, remote?: string): Promise<string[]> {
  const resolvedRemote = remote ?? (await resolveUpstreamRemote());
  if (!resolvedRemote) {
    return [];
  }

  try {
    const { stdout } = await execa(
      'git',
      ['rev-list', '--max-count', String(limit), `${resolvedRemote}/main`],
      { cwd: REPO_ROOT }
    );
    return stdout
      .split('\n')
      .map((sha: string) => sha.trim())
      .filter((sha: string) => sha.length > 0);
  } catch {
    return [];
  }
}

export function isCiEnvironment() {
  return (process.env.CI ?? '').toLowerCase() === 'true';
}

export async function detectLocalChanges(): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
  });

  return stdout.trim().length > 0;
}

export async function withGcsAuth<TReturn>(
  log: SomeDevLog,
  action: (accessToken: string) => Promise<TReturn>
): Promise<TReturn> {
  await execa(GCLOUD_ACTIVATE_SCRIPT, [GCS_BUCKET_NAME], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  try {
    const token = await getGcloudAccessToken();
    if (!token) {
      throw new Error('Failed to obtain GCS access token after activating service account.');
    }
    return await action(token);
  } finally {
    try {
      await execa(GCLOUD_ACTIVATE_SCRIPT, ['--unset-impersonation'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    } catch (unsetError) {
      const unsetErrorDetails =
        unsetError instanceof Error ? unsetError.message : String(unsetError);
      log.warning(`Failed to unset GCP impersonation: ${unsetErrorDetails}`);
    }
  }
}

export async function ensureLocalCacheRoot() {
  await Fs.promises.mkdir(LOCAL_CACHE_ROOT, { recursive: true });
}

/**
 * Check if the gcloud CLI is installed and the user has active auth.
 * Returns true only if both conditions are met. Never throws.
 */
export async function isGcloudAvailable(): Promise<boolean> {
  return (await getGcloudAccessToken()) !== undefined;
}

/**
 * Get a GCS access token from the gcloud CLI.
 * This serves as both an availability check and token retrieval in a single
 * gcloud invocation, avoiding the overhead of multiple CLI calls.
 * Returns undefined if gcloud is not installed or has no active auth. Never throws.
 */
export async function getGcloudAccessToken(): Promise<string | undefined> {
  try {
    const { stdout } = await execa('gcloud', ['auth', 'print-access-token'], {
      stderr: 'ignore',
    });
    const token = stdout.trim();
    return token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}

export function buildCandidateShaList(currentSha: string | undefined, history: string[]): string[] {
  const uniqueShas = new Set<string>();

  if (currentSha) {
    uniqueShas.add(currentSha);
  }

  for (const sha of history) {
    if (sha) {
      uniqueShas.add(sha);
    }
  }

  return Array.from(uniqueShas);
}

export interface CommitDistanceInfo {
  distance: number;
  commits: Array<{ sha: string; subject: string }>;
  cachedAge: string;
  freshness?: {
    totalProjects: number;
    affectedProjects: number;
    changedFiles: number;
  };
}

/**
 * Compute how many commits HEAD is ahead of a cached SHA and return
 * structured data so the caller can render a freshness indicator.
 *
 * Also estimates how many TypeScript projects are affected by the diff
 * between the cached SHA and HEAD (by cross-referencing `git diff --name-only`
 * with the project directories from `config-paths.json`).
 *
 * Returns undefined when the distance can't be determined (e.g. the
 * cached SHA is no longer in the local history).
 */
export async function getCommitDistanceInfo(
  headSha: string,
  cachedSha: string
): Promise<CommitDistanceInfo | undefined> {
  const MAX_VISIBLE_COMMITS = 5;
  const CONFIG_PATHS_FILE = Path.resolve(REPO_ROOT, 'packages/kbn-ts-projects/config-paths.json');

  try {
    // --first-parent follows only the main line at each merge, giving an
    // intuitive "how many steps back from HEAD" count rather than including
    // every commit from the other side of merge commits.
    // --no-merges hides merge commits in the log to surface actual changes.
    const [countResult, logResult, ageResult, diffResult, configPathsRaw] = await Promise.all([
      execa('git', ['rev-list', '--first-parent', '--count', `${cachedSha}..${headSha}`], {
        cwd: REPO_ROOT,
      }),
      execa(
        'git',
        [
          'log',
          '--first-parent',
          '--no-merges',
          '--oneline',
          '--max-count',
          String(MAX_VISIBLE_COMMITS),
          `${cachedSha}..${headSha}`,
        ],
        { cwd: REPO_ROOT }
      ),
      execa('git', ['log', '-1', '--format=%cr', cachedSha], { cwd: REPO_ROOT }),
      execa('git', ['diff', '--name-only', `${cachedSha}..${headSha}`], { cwd: REPO_ROOT }),
      Fs.promises.readFile(CONFIG_PATHS_FILE, 'utf8').catch(() => null),
    ]);

    const distance = parseInt(countResult.stdout.trim(), 10);

    const commits = logResult.stdout
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((line) => {
        const spaceIdx = line.indexOf(' ');
        return {
          sha: line.slice(0, spaceIdx),
          subject: line.slice(spaceIdx + 1),
        };
      });

    let freshness: CommitDistanceInfo['freshness'];

    if (configPathsRaw) {
      const changedFiles = diffResult.stdout.split('\n').filter((f) => f.trim().length > 0);

      const configPaths: string[] = JSON.parse(configPathsRaw);
      const projectDirs = configPaths.map((p) => Path.dirname(p)).filter((d) => d !== '.');

      // For each changed file, find the most specific (deepest) matching
      // project directory so we don't double-count nested projects.
      const affectedDirs = new Set<string>();
      for (const file of changedFiles) {
        let bestMatch = '';
        for (const dir of projectDirs) {
          if (file.startsWith(dir + '/') && dir.length > bestMatch.length) {
            bestMatch = dir;
          }
        }
        if (bestMatch) {
          affectedDirs.add(bestMatch);
        }
      }

      freshness = {
        totalProjects: projectDirs.length,
        affectedProjects: affectedDirs.size,
        changedFiles: changedFiles.length,
      };
    }

    return {
      distance,
      commits,
      cachedAge: ageResult.stdout.trim(),
      freshness,
    };
  } catch {
    return undefined;
  }
}

/**
 * Log a small graph showing how far HEAD is from the cached artifacts,
 * giving the developer an idea of how stale the cache is and how much
 * tsc will need to rebuild incrementally.
 */
export function logArtifactFreshness(
  log: SomeDevLog,
  headSha: string,
  cachedSha: string,
  info: CommitDistanceInfo
): void {
  const headShort = headSha.slice(0, 12);
  const cachedShort = cachedSha.slice(0, 12);

  if (info.distance === 0) {
    const freshLine = info.freshness
      ? ` All ${info.freshness.totalProjects} projects should be up-to-date.`
      : '';
    log.info(`The restored TS cache is an exact match for HEAD (${headShort}).${freshLine}`);
    return;
  }

  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max - 3) + '...' : s);
  const lines: string[] = [];

  lines.push(`  ● HEAD (${headShort}) (local)`);
  lines.push('  │');

  for (const { subject } of info.commits) {
    lines.push(`  ├── ${truncate(subject, 60)}`);
  }

  const remaining = info.distance - info.commits.length;
  if (remaining > 0) {
    lines.push(`  │   ... ${remaining} more commit(s)`);
  }

  lines.push('  │');
  lines.push(`  ● ${cachedShort} (TS artifacts from CI, ${info.cachedAge})`);

  if (info.freshness) {
    const { totalProjects, affectedProjects, changedFiles } = info.freshness;
    const freshProjects = totalProjects - affectedProjects;
    const freshPercent = Math.round((freshProjects / totalProjects) * 100);

    lines.push('');
    lines.push(
      `  ${changedFiles} file(s) changed across ${affectedProjects} of ${totalProjects} projects.\n`
    );
    lines.push(
      `  ${chalk[freshnessColor(freshPercent)](
        `${freshProjects} projects (~${freshPercent}%) up-to-date.`
      )}
`
    );
  }

  log.info(`The restored TS cache is ${info.distance} commit(s) behind HEAD:\n${lines.join('\n')}`);
}

export async function cleanTypeCheckArtifacts(log: SomeDevLog) {
  const directoryMatches = await globby(TYPES_DIRECTORY_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyDirectories: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const directoryPaths: string[] = Array.from(new Set<string>(directoryMatches));

  const configMatches = await globby(TYPE_CHECK_CONFIG_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const configPaths: string[] = Array.from(new Set<string>(configMatches));

  await asyncForEachWithLimit(directoryPaths, 10, async (directoryPath) => {
    await Fs.promises.rm(directoryPath, { recursive: true, force: true });
  });

  await asyncForEachWithLimit(configPaths, 25, async (configPath) => {
    await Fs.promises.rm(configPath, { force: true });
  });

  if (directoryPaths.length > 0 || configPaths.length > 0) {
    log.info(
      `Cleared ${directoryPaths.length} type cache directories and ${configPaths.length} config files before restore.`
    );
  }
}

/**
 * Calculate the SHA256 hash of a file.
 * Returns null if the file doesn't exist.
 */
export async function calculateFileHash(filePath: string): Promise<string | null> {
  const fullPath = Path.resolve(REPO_ROOT, filePath);
  if (!Fs.existsSync(fullPath)) {
    return null;
  }

  const hash = createHash('sha256');
  await pipeline(Fs.createReadStream(fullPath), hash);
  return hash.digest('hex');
}

/**
 * Calculate hashes for a set of files relative to REPO_ROOT.
 * Returns a record mapping file paths to their hashes (or null if file doesn't exist).
 */
export async function calculateFileHashes(
  filePaths: string[]
): Promise<Record<string, string | null>> {
  const hashes: Record<string, string | null> = {};
  await asyncForEachWithLimit(filePaths, 10, async (filePath) => {
    hashes[filePath] = await calculateFileHash(filePath);
  });
  return hashes;
}

const freshnessColor = (freshPercent: number) => {
  if (freshPercent < 20) {
    return 'red';
  }
  if (freshPercent < 50) {
    return 'yellow';
  }
  return 'green';
};
