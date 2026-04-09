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

import { table, getBorderCharacters } from 'table';
import { getChangedFiles, getAffectedProjectRefs } from './root_refs_config';
import { TscProgressTracker } from './tsc_progress_tracker';
import {
  buildForwardDependencyMap,
  buildReverseDependencyMap,
  computeEffectiveRebuildSet,
} from '../cache/dependency_graph';

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

  const forwardDeps = buildForwardDependencyMap(projects);
  const reverseDeps = buildReverseDependencyMap(projects);

  // For each changed project compute both directions of the dep graph.
  // Counts exclude the root project itself.
  const perProject = configPaths.map((configPath) => {
    const abs = Path.resolve(REPO_ROOT, configPath);
    const depCount = computeEffectiveRebuildSet(new Set([abs]), forwardDeps).size - 1;
    const dependentCount = computeEffectiveRebuildSet(new Set([abs]), reverseDeps).size - 1;
    return { depCount, dependentCount };
  });

  // Union of each changed project's full forward closure = all projects tsc -b will touch.
  const firstPassProjectCount = configPaths.reduce((acc, configPath) => {
    const abs = Path.resolve(REPO_ROOT, configPath);
    for (const p of computeEffectiveRebuildSet(new Set([abs]), forwardDeps)) {
      acc.add(p);
    }
    return acc;
  }, new Set<string>()).size;

  const naiveDepsSum = perProject.reduce((sum, p) => sum + p.depCount, 0);
  const uniqueDepsCount = firstPassProjectCount - affectedRefs.size;
  const overlap = naiveDepsSum - uniqueDepsCount;
  const totalDependentsCount = perProject.reduce((sum, p) => sum + p.dependentCount, 0);

  // Table 1 — changed projects with their dependency and dependent counts.
  const table1Rows = perProject.map(({ depCount, dependentCount }, i) => [
    projectNames[i],
    String(depCount),
    dependentCount === 0 ? '—' : String(dependentCount),
  ]);
  const table1Output = table([['Project', 'Dependencies', 'Dependents'], ...table1Rows], {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (i, rowCount) => i === 0 || i === 1 || i === rowCount,
  });

  // Table 2 — first pass scope build-up, showing how the 824 is reached.
  const table2Rows: string[][] = [];
  for (let i = 0; i < projectNames.length; i++) {
    table2Rows.push([projectNames[i], '1']);
    table2Rows.push([`  dependencies`, String(perProject[i].depCount)]);
  }
  if (overlap > 0) {
    table2Rows.push([`shared dependencies`, `-${overlap}`]);
  }
  const table2Output = table([...table2Rows, [`First pass scope`, String(firstPassProjectCount)]], {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (i, rowCount) => i === 0 || i === rowCount - 1 || i === rowCount,
  });

  log.info(`[TypeCheck] ${affectedRefs.size} changed ${multi ? 'projects' : 'project'}:`);
  for (const line of table1Output.trimEnd().split('\n')) {
    log.info(`[TypeCheck] ${line}`);
  }
  log.info(`[TypeCheck] First pass scope (quick check):`);
  for (const line of table2Output.trimEnd().split('\n')) {
    log.info(`[TypeCheck] ${line}`);
  }
  if (totalDependentsCount > 0) {
    log.info(`[TypeCheck] Full pass also checks ${totalDependentsCount} downstream dependent(s).`);
  }

  log.info(`[TypeCheck] [First pass] Checking ${firstPassProjectCount} projects...`);

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

  const tracker = new TscProgressTracker({
    logInfo: (msg) => log.info(msg),
    passLabel: type,
  });

  tracker.start();

  if (child.stdout) {
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => tracker.processLine(line));
  }

  // Collect stderr to detect tsc crashes caused by incompatible .tsbuildinfo files
  // (e.g. after a TypeScript version bump or new project-reference entries).
  const stderrLines: string[] = [];
  if (child.stderr) {
    const rl = createInterface({ input: child.stderr });
    rl.on('line', (line) => {
      tracker.addStderrLine(line);
      stderrLines.push(line);
    });
  }

  const result = await child;

  // Detect the specific tsc crash that occurs when .tsbuildinfo files contain
  // data incompatible with the current TypeScript version or project graph.
  // This manifests as "Cannot read properties of undefined (reading 'forEach')"
  // inside createBuilderProgramUsingIncrementalBuildInfo.
  const isTsBuildInfoCrash =
    result.exitCode !== 0 &&
    stderrLines.some(
      (l) =>
        l.includes('createBuilderProgramUsingIncrementalBuildInfo') ||
        (l.includes('Cannot read properties of undefined') && l.includes('forEach'))
    );

  tracker.stop();

  if (isTsBuildInfoCrash) {
    tracker.printErrors();
    const { builtProjects, builtProjectTimings } = tracker.getSummary();
    logRebuiltProjects(log, type, builtProjects, builtProjectTimings);
    log.warning(
      '[TypeCheck] tsc crashed while reading incremental build state (.tsbuildinfo). ' +
        'This usually means the TypeScript version changed or new project references were added ' +
        'that conflict with cached build artifacts.'
    );
    log.warning('[TypeCheck] Run with --clean-cache to remove stale artifacts and retry.');
    return false;
  }

  tracker.printErrors();

  const {
    totalProjects,
    completedProjects,
    builtProjects,
    skippedProjects,
    elapsed,
    builtProjectTimings,
  } = tracker.getSummary();

  if (result.killed || result.signal) {
    log.warning(
      `[${type}] Type check cancelled after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  } else if (result.exitCode === 0) {
    log.info(
      `[TypeCheck] [${type}] Type checked ${totalProjects} projects successfully in ${elapsed} (${builtProjects} built, ${skippedProjects} up-to-date).`
    );
  } else {
    log.error(
      `[TypeCheck] [${type}] Type check failed after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  }

  logRebuiltProjects(log, type, builtProjects, builtProjectTimings);

  return result.exitCode === 0;
}

function logRebuiltProjects(
  log: SomeDevLog,
  type: string,
  builtProjects: number,
  builtProjectTimings: Array<{ name: string; path: string; ms: number }>
) {
  if (builtProjects === 0) return;

  const prefix = `[TypeCheck] [${type}]`;
  const formatMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  // Detect duplicate short names so we can show a disambiguating parent segment.
  const nameCounts = new Map<string, number>();
  for (const { name } of builtProjectTimings) {
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const displayName = ({ name, path }: { name: string; path: string }) => {
    if ((nameCounts.get(name) ?? 0) > 1) {
      const parts = path.replace(/\\/g, '/').split('/');
      const idx = parts.indexOf(name);
      return idx >= 1 ? `${parts[idx - 1]}/${name}` : path;
    }
    return name;
  };

  // Header line with total count.
  log.info(`${prefix} Rebuilt ${builtProjects} project(s):`);

  // One project per line to avoid line-length truncation in log transports.
  for (const t of builtProjectTimings) {
    log.info(`${prefix}   ${displayName(t)} (${formatMs(t.ms)})`);
  }
}
