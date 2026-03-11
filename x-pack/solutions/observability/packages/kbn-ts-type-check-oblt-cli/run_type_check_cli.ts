/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import chalk from 'chalk';
import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import {
  readArtifactsState,
  restoreTSBuildArtifacts,
  writeArtifactsState,
} from './src/archive/restore_ts_build_artifacts';
import { detectLocalChanges, isCiEnvironment, resolveCurrentCommitSha } from './src/archive/utils';
import { detectStaleArtifacts } from './src/detect_stale_artifacts';
import { createTypeCheckConfigs } from './src/create_type_check_configs';
import { runTsc, runTscFastPass } from './src/run_tsc';
import { cleanCache } from './src/clean_cache';
import { normalizeProjectPath } from './src/normalize_project_path';

run(
  async ({ log, flagsReader, procRunner }) => {
    const scriptStart = Date.now();

    const isVerbose = flagsReader.boolean('verbose');
    const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);
    const shouldRestoreOnly = flagsReader.boolean('restore-artifacts');
    const extendedDiagnostics = flagsReader.boolean('extended-diagnostics');
    const shouldCleanCache = flagsReader.boolean('clean-cache');
    const shouldUseArchive = flagsReader.boolean('with-archive');

    const useProgressBar = !isCiEnvironment() && !isVerbose;

    if (shouldRestoreOnly) {
      await restoreTSBuildArtifacts(log);
      return;
    }

    if (shouldCleanCache) {
      await cleanCache();
      log.info('Deleted all TypeScript caches');
    }

    // Lazy-load so --help can run before TS project metadata is available.
    const { TS_PROJECTS } = await import('@kbn/ts-projects');
    const { updateRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import('./root_refs_config');

    await Promise.all([
      updateRootRefsConfig(log),
      shouldUseArchive ? restoreTSBuildArtifacts(log) : Promise.resolve(),
    ]);

    const projectsToCheck = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    if (projectFilter && projectsToCheck.length === 0) {
      throw createFailError(`No type-checkable project found at path: ${projectFilter}`);
    }

    // When using --with-archive the restore has already placed CI-consistent
    // tsconfig.type_check.json files on disk. We only create files that are
    // genuinely missing (e.g. a new package not yet in the archive). Existing
    // files are left untouched so tsc sees a coherent set of configs and
    // target/types, avoiding unnecessary full rebuilds.
    // Without --with-archive we always regenerate to pick up kbn_references changes.
    await createTypeCheckConfigs(log, projectsToCheck, TS_PROJECTS, {
      onlyCreateMissing: shouldUseArchive,
    });

    // ── Detect freshness of artifacts on filesystem ──────────────────────────────────────────────────
    /*
     * Detects stale artifacts by comparing the restored commit SHA with the current HEAD.
     * If stale artifacts are found, it logs which projects will have to be rechecked during type checking.
     * If more than 5 projects are stale, it suggests running with --clear-cache --with-archive to retrieve
     * fresh artifacts from remote for the best type check performance.
     */
    const state = await readArtifactsState();

    if (state) {
      const stale = await detectStaleArtifacts({
        fromCommit: state.restoredSha,
        toCommit: 'HEAD',
        sourceConfigPaths: TS_PROJECTS.map((p) => p.path),
      });

      const shortSha = state.restoredSha.slice(0, 12);

      if (stale.size === 0) {
        log.info(
          `[Cache check] ${chalk.green(
            '✓ All artifacts are up-to-date'
          )} — no committed changes since ${shortSha}.`
        );
      } else {
        log.info(
          `[Cache check] ${stale.size} project${stale.size === 1 ? '' : 's'} ${
            stale.size === 1 ? 'has' : 'have'
          } stale artifacts due to committed changes since ${shortSha}:`
        );

        for (const tsConfigPath of [...stale].sort()) {
          log.info(
            `[Cache check]   * ${Path.relative(REPO_ROOT, tsConfigPath).replace(
              '/tsconfig.type_check.json',
              ''
            )}`
          );
        }

        if (stale.size > 0 && stale.size < 6) {
          log.info(
            `[Cache check] ${chalk.green(
              '✓ Cache freshness is good'
            )}, no need to restore fresh artifacts from remote.`
          );
        } else {
          log.info(
            `[Cache check] ${chalk.yellow('⚠️ More than 5 projects have stale artifacts.')} `
          );

          if (!isCiEnvironment()) {
            log.info(
              'Run with --clean-cache --with-archive to attempt to retrieve fresh artifacts from remote for the best type check performance.'
            );
          }
        }
      }
    }

    // ── Type checking ──────────────────────────────────────────────────────────
    let didTypeCheckFail = false;

    // Fail-fast pass: type-check only the projects with local changes so the
    // engineer gets immediate feedback (~10-15 s) before the full build runs.
    if (!isCiEnvironment() && !projectFilter) {
      didTypeCheckFail = !(await runTscFastPass({
        projects: projectsToCheck,
        log,
        procRunner,
        procRunnerKey: 'tsc-fast',
        options: { isVerbose, extendedDiagnostics, useProgressBar },
      }));
    }

    if (!didTypeCheckFail) {
      const configPath = Path.relative(
        REPO_ROOT,
        projectFilter ? projectsToCheck[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
      );

      // +1 for the root refs config that references all projects.
      log.info(`[Full pass] Checking ${projectsToCheck.length + 1} projects...`);

      didTypeCheckFail = !(await runTsc({
        procRunner,
        procRunnerKey: 'tsc',
        log,
        configPaths: [configPath],
        options: {
          isVerbose,
          extendedDiagnostics,
          useProgressBar,
        },
      }));
    }

    // ── Post-check ─────────────────────────────────────────────────────────────
    if (shouldUseArchive) {
      // Archiving to GCS only happens on CI, so the clean-tree check is
      // only meaningful there. Locally, archiveTSBuildArtifacts is a no-op.
      if (isCiEnvironment()) {
        const hasLocalChanges = await detectLocalChanges();
        if (hasLocalChanges) {
          throw new Error(
            'Canceling TypeScript cache archive: the working tree has uncommitted changes. ' +
              'Archives must be generated from a clean working tree.'
          );
        }
      }

      await archiveTSBuildArtifacts(log);

      // Always update the state file so subsequent runs can detect artifact freshness.
      const headSha = await resolveCurrentCommitSha();
      if (headSha) {
        await writeArtifactsState(headSha);
      }
    } else {
      log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
    }

    const elapsed = ((Date.now() - scriptStart) / 1000).toFixed(1);
    log.info(`Total elapsed time: ${elapsed}s`);

    if (didTypeCheckFail) {
      throw createFailError('Unable to build TS project refs');
    }
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in all projects
        node scripts/type_check

        # check types in a single project
        node scripts/type_check --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project'],
      boolean: ['clean-cache', 'extended-diagnostics', 'with-archive', 'restore-artifacts'],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete all TypeScript caches and generated config files, then perform a
                                  full type check.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --with-archive          Restore cached artifacts before running and archive results afterwards.
                                  Locally, this will try to fetch from GCS first (requires gcloud auth login)
                                  and fall back to the local cache. Downloaded archives are cached locally
                                  for offline reuse.
        --restore-artifacts     Only restore cached build artifacts (from GCS or local cache) without
                                  running the type check. Useful for pre-populating the cache.
      `,
    },
  }
);
