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
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { asyncForEachWithLimit } from '@kbn/std';
import { CACHE_IGNORE_GLOBS, TYPES_DIRECTORY_GLOB, TYPE_CHECK_CONFIG_GLOB } from './constants';
export type { ArchiveMetadata } from './file_system/types';

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
    log.verbose(
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
