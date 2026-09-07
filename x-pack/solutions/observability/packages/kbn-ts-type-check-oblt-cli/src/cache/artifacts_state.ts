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
import { asyncForEachWithLimit } from '@kbn/std';
import { ARTIFACTS_STATE_FILE, CACHE_INVALIDATION_FILES } from './constants';

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

  const checks = tsconfigPaths.map(async (tsconfigRel) => {
    const projectDir = Path.dirname(Path.resolve(REPO_ROOT, tsconfigRel));
    try {
      await Fs.promises.access(Path.join(projectDir, 'target', 'types'));
      return true;
    } catch {
      return false;
    }
  });

  // Check all projects rather than a sample: a partial `--project` run writes
  // target/types for only one project, and sampling could miss it, producing a
  // false negative that triggers an unnecessary GCS restore.
  return (await Promise.all(checks)).some(Boolean);
}

/**
 * Deletes the .tsbuildinfo file for each project in the given set of
 * tsconfig.type_check.json paths. This forces tsc to re-type-check those
 * projects on the next --build run even when their source file hashes still
 * match the stored .tsbuildinfo — which can happen when a historical
 * successful compilation is on disk but the code has since become invalid
 * (e.g. a dependency's re-exported API changed without the re-export file
 * itself changing).
 *
 * Only deletes the .tsbuildinfo; the compiled .d.ts outputs in target/types
 * are left intact so other projects can still reference them.
 */
export async function invalidateTsBuildInfoFiles(
  projectPaths: Set<string>,
  log: SomeDevLog
): Promise<void> {
  let deleted = 0;

  await asyncForEachWithLimit([...projectPaths], 20, async (tsConfigPath) => {
    const projectDir = Path.dirname(tsConfigPath);
    const tsBuildInfoPath = Path.join(
      projectDir,
      'target',
      'types',
      'tsconfig.type_check.tsbuildinfo'
    );

    try {
      await Fs.promises.unlink(tsBuildInfoPath);
      deleted++;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.verbose(
          `[Cache] Could not delete ${tsBuildInfoPath}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  });

  if (deleted > 0) {
    log.verbose(
      `[Cache] Invalidated ${deleted} stale .tsbuildinfo file(s) to force tsc to recheck them.`
    );
  }
}

/**
 * Returns the subset of CACHE_INVALIDATION_FILES that changed between the
 * given commit SHA and HEAD. Used to detect whether local build artifacts
 * were created against different node_modules (e.g. after a yarn.lock update)
 * and therefore can no longer be trusted for incremental tsc correctness.
 */
export async function getChangedInvalidationFiles(fromSha: string): Promise<string[] | undefined> {
  try {
    const { stdout } = await execa(
      'git',
      ['diff', '--name-only', fromSha, 'HEAD', '--', ...CACHE_INVALIDATION_FILES],
      { cwd: REPO_ROOT }
    );
    return stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } catch {
    // fromSha may be unreachable (branch switch, shallow clone, GC) — returning
    // undefined signals "cache safety unknown" so callers can be conservative.
    return undefined;
  }
}
