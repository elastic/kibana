/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { spawnSync } from 'child_process';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';

import {
  resolveRestoreStrategy,
  restoreTSBuildArtifacts,
} from './cache/restore_ts_build_artifacts';
import { writeArtifactsState } from './cache/artifacts_state';
import { isCiEnvironment, resolveCurrentCommitSha } from './cache/utils';
import { createTypeCheckConfigs } from './tsc/create_type_check_configs';
import { runTsc, runTscFastPass } from './tsc/run_tsc';
import { cleanCache } from './cache/clean_cache';
import { normalizeProjectPath } from './tsc/normalize_project_path';

run(
  async ({ log, flagsReader, procRunner }) => {
    const scriptStart = Date.now();

    const isVerbose = flagsReader.boolean('verbose');
    const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);
    const restoreArtifactsArg = flagsReader.string('restore-artifacts');
    const extendedDiagnostics = flagsReader.boolean('extended-diagnostics');
    const shouldCleanCache = flagsReader.boolean('clean-cache');

    const useProgressBar = !isCiEnvironment() && !isVerbose;

    if (restoreArtifactsArg !== undefined) {
      const specificSha = restoreArtifactsArg || undefined;
      await restoreTSBuildArtifacts(log, specificSha, { skipExistingArtifactsCheck: true });
      return;
    }

    if (shouldCleanCache) {
      log.info('Cleaning TypeScript caches...');
      await cleanCache();
      log.info('Deleted all TypeScript caches.');
      return;
    }

    // Lazy-load so --help can run before TS project metadata is available.
    const { TS_PROJECTS } = await import('@kbn/ts-projects');
    const { updateRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import('./tsc/root_refs_config');

    // Pre-flight: validate the project reference graph before doing any
    // network I/O. When switching branches without re-running bootstrap,
    // a kibana.jsonc may reference a package whose tsconfig does not yet
    // exist, causing a cryptic crash inside createTypeCheckConfigs after
    // spending minutes on a GCS restore. Catching it here gives a clear,
    // actionable error immediately.
    //
    // When --project is set we only need to validate the single project's
    // reference chain; otherwise validate all projects.
    const projectsToValidate = projectFilter
      ? TS_PROJECTS.filter((p) => p.path === projectFilter)
      : TS_PROJECTS;

    const brokenRefs: string[] = [];
    for (const p of projectsToValidate) {
      try {
        p.getKbnRefs(TS_PROJECTS);
      } catch (err) {
        brokenRefs.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (brokenRefs.length > 0) {
      if (process.env.KBN_TS_TYPE_CHECK_BOOTSTRAP_RETRIED === '1') {
        throw createFailError(
          'Broken TypeScript project references remain after `yarn kbn bootstrap`. Fix manually: yarn kbn bootstrap'
        );
      }

      log.warning('[Bootstrap] Broken TypeScript project references detected:');
      for (const msg of brokenRefs.slice(0, 5)) {
        log.warning(`  ${msg}`);
      }
      if (brokenRefs.length > 5) {
        log.warning(`  … and ${brokenRefs.length - 5} more`);
      }
      log.warning('');
      log.warning(
        '[Bootstrap] This usually happens after switching branches. ' +
          'Running yarn kbn bootstrap to repair...'
      );

      try {
        await execa('yarn', ['kbn', 'bootstrap'], { cwd: REPO_ROOT, stdio: 'inherit' });
      } catch {
        log.error('[Bootstrap] Bootstrap failed. Fix it manually: yarn kbn bootstrap');
        throw createFailError('Bootstrap failed');
      }

      // Bootstrap updates node_modules and regenerates config files. The
      // already-imported @kbn/ts-projects module is stale in Node's module
      // cache, so we must restart the process entirely to pick up the new
      // project graph. Re-exec with identical arguments.
      log.info('[Bootstrap] Bootstrap complete — restarting type check with fresh project data...');
      const { status } = spawnSync(process.execPath, process.argv.slice(1), {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, KBN_TS_TYPE_CHECK_BOOTSTRAP_RETRIED: '1' },
      });
      process.exit(status ?? 1);
    }

    // Decide whether to restore artifacts from GCS before type checking.
    // CI always restores (and archives after). Locally, the smart strategy
    // checks whether local artifacts are fresh enough or a GCS restore would
    // save significant rebuild work (based on effective rebuild count).
    let didRestore = false;

    if (isCiEnvironment()) {
      await Promise.all([
        updateRootRefsConfig(log),
        restoreTSBuildArtifacts(log).then(() => {
          didRestore = true;
        }),
      ]);
    } else {
      await updateRootRefsConfig(log);

      if (!projectFilter) {
        const strategy = await resolveRestoreStrategy(log, TS_PROJECTS);
        if (strategy.shouldRestore && strategy.bestSha) {
          await restoreTSBuildArtifacts(log, strategy.bestSha, {
            staleProjects: strategy.staleProjects,
            prNumber: strategy.prNumber,
            prTipSha: strategy.prTipSha,
            skipCacheServer: !strategy.cacheServerAvailable,
          });
          didRestore = true;
        }
      }
    }

    const projectsToCheck = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    if (projectFilter && projectsToCheck.length === 0) {
      throw createFailError(`No type-checkable project found at path: ${projectFilter}`);
    }

    // Always regenerate configs via content comparison so they stay in sync with HEAD.
    // After a GCS restore the archived configs and .tsbuildinfo files share the same
    // old timestamp. When we rewrite a config whose content changed (e.g. new package
    // references added since the archive), we reset its mtime back to its pre-write
    // value. This way tsc sees the config as no newer than the archived .tsbuildinfo
    // and uses the cache on the first post-restore run. Subsequent runs find no content
    // changes, so no files are rewritten and timestamps stay stable indefinitely.
    await createTypeCheckConfigs(log, projectsToCheck, TS_PROJECTS, {
      preserveTimestampOnWrite: didRestore,
    });

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
      log.info(`[TypeCheck] [Full pass] Checking ${projectsToCheck.length + 1} projects...`);

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

    // ── Record freshness state ───────────────────────────────────────────────────
    // After any full tsc run (success or failure) the local .tsbuildinfo files
    // correspond to HEAD's sources. Writing the SHA here — even on failure —
    // prevents the next run from re-invalidating projects tsc already processed.
    //
    // Why it is safe to write on failure:
    //   tsc --build writes a .tsbuildinfo for every project it processes,
    //   regardless of whether that project had errors. On the next run tsc reads
    //   each .tsbuildinfo and decides whether to rebuild:
    //     • project with no errors whose sources are unchanged → up-to-date, skipped
    //     • project with stored errors whose sources are unchanged → errors replayed
    //       from .tsbuildinfo (no recompile), which is what we want
    //     • project whose sources changed → rebuilt from scratch
    //   If we leave the state at the GCS archive SHA instead, resolveRestoreStrategy
    //   will call detectStaleArtifacts(from: archiveSha, to: HEAD) on the next run,
    //   see all post-archive projects as stale, call invalidateTsBuildInfoFiles to
    //   delete their .tsbuildinfo, and force tsc to rebuild them all — including
    //   projects that were already correct in the previous run.
    if (!projectFilter && !isCiEnvironment()) {
      try {
        const headSha = await resolveCurrentCommitSha();
        if (headSha) {
          await writeArtifactsState(headSha);
        }
      } catch {
        // Non-fatal — worst case the next run treats local artifacts as unknown state.
      }
    }

    const elapsed = ((Date.now() - scriptStart) / 1000).toFixed(1);
    log.info(`[TypeCheck] Total elapsed time: ${elapsed}s`);

    if (didTypeCheckFail) {
      throw createFailError('Unable to build TS project refs');
    }
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in all projects
        node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js

        # check types in a single project
        node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project', 'restore-artifacts'],
      boolean: ['clean-cache', 'extended-diagnostics'],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete all TypeScript caches and generated config files.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --restore-artifacts [sha]  Only restore cached build artifacts (from GCS or local cache) without
                                     running the type check. When [sha] is provided, restores that exact
                                     commit's archive; otherwise runs full candidate discovery.
                                     Useful for pre-populating the cache or testing a specific archive.
      `,
    },
  }
);
