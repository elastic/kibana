/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import execa from 'execa';
import { createInterface } from 'readline';
import normalize from 'normalize-path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { TsProject } from '@kbn/ts-projects';

import { getChangedFiles, getAffectedProjectRefs } from './root_refs_config';
import { TscProgressTracker } from './tsc_progress_tracker';

interface TscRunOptions {
  type?: 'Full pass' | 'First pass';
  log: SomeDevLog;
  procRunner: ProcRunner;
  procRunnerKey: string;
  options: { isVerbose: boolean; extendedDiagnostics: boolean; useProgressBar: boolean };
}

/**
 * Invokes tsc against the given config paths, returning `true` if tsc exited
 * with code 0, `false` otherwise.
 *
 * When `useProgressBar` is true, spawns tsc directly and renders a progress bar.
 * When false, delegates to `procRunner` which streams raw output — suitable for
 * CI and verbose mode where the progress bar is not appropriate.
 */
export async function runTsc({
  type = 'Full pass',
  log,
  procRunner,
  procRunnerKey,
  configPaths,
  options,
}: TscRunOptions & { configPaths: string[] }): Promise<boolean> {
  const { isVerbose, extendedDiagnostics, useProgressBar } = options;

  const cmd = Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc'));
  const env = { NODE_OPTIONS: '--max-old-space-size=10240' };
  const args = [
    '-b',
    ...configPaths,
    '--pretty',
    ...(isVerbose ? ['--verbose'] : []),
    ...(extendedDiagnostics ? ['--extendedDiagnostics'] : []),
  ];

  if (useProgressBar) {
    return runTscWithProgress({ cmd, args, env, cwd: REPO_ROOT, type, log });
  }

  try {
    await procRunner.run(procRunnerKey, { cmd, args, env, cwd: REPO_ROOT, wait: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fail-fast pass: type-checks only the projects with locally changed files,
 * giving the developer quick feedback before the full build runs.
 *
 * Returns `true` immediately if no projects are affected by local changes (no-op, not a failure).
 * Returns `true` if tsc exited with code 0, `false` otherwise.
 */
export async function runTscFastPass({
  projects,
  log,
  procRunner,
  procRunnerKey,
  options,
}: TscRunOptions & { projects: TsProject[] }): Promise<boolean> {
  const changedFiles = await getChangedFiles();
  const allRefs = projects.map(
    (p) => `./${normalize(Path.relative(REPO_ROOT, p.typeCheckConfigPath))}`
  );
  const affectedRefs = getAffectedProjectRefs(changedFiles, allRefs);

  if (affectedRefs.size === 0) {
    return true;
  }

  const configPaths = [...affectedRefs].map((ref) =>
    Path.relative(REPO_ROOT, Path.resolve(REPO_ROOT, ref))
  );

  const projectNames = configPaths.map((c) => {
    const parts = c.replace(/\\/g, '/').split('/');
    return parts.length >= 2 ? parts[parts.length - 2] : c;
  });
  const multi = affectedRefs.size > 1;

  log.info(
    `[TypeCheck] [First pass] Checking ${affectedRefs.size} changed ${
      multi ? 'projects' : 'project'
    } first (${projectNames.join(', ')}) with ${
      multi ? 'their' : 'its'
    } dependencies for fast feedback...`
  );

  const success = await runTsc({
    log,
    type: 'First pass',
    procRunner,
    procRunnerKey,
    options,
    configPaths,
  });

  if (!success) {
    log.error('Type errors found in locally changed projects.');
  }

  return success;
}

async function runTscWithProgress({
  cmd,
  args,
  env,
  cwd,
  type,
  log,
}: {
  cmd: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  type: string;
  log: SomeDevLog;
}): Promise<boolean> {
  const child = execa(cmd, [...args, '--verbose'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
    preferLocal: true,
    reject: false,
  });

  const tracker = new TscProgressTracker();

  tracker.start();

  if (child.stdout) {
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => tracker.processLine(line));
  }

  if (child.stderr) {
    const rl = createInterface({ input: child.stderr });
    rl.on('line', (line) => tracker.addStderrLine(line));
  }

  const result = await child;

  tracker.stop();
  tracker.printErrors();

  const { totalProjects, completedProjects, builtProjects, skippedProjects, elapsed } =
    tracker.getSummary();

  if (result.killed || result.signal) {
    log.warning(
      `[${type}] Type check cancelled after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  } else if (result.exitCode === 0) {
    log.info(
      `[${type}] Type checked ${totalProjects} projects successfully in ${elapsed} (${builtProjects} built, ${skippedProjects} up-to-date).`
    );
  } else {
    log.error(
      `[${type}] Type check failed after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  }

  return result.exitCode === 0;
}
