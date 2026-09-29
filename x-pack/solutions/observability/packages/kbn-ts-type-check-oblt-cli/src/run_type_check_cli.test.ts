/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';

vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = { run: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/dev-cli-errors', () => {
      const mocked = {
      createFailError: vi.fn((msg: string) => new Error(msg)),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/repo-info', () => {
      const mocked = { REPO_ROOT: '/repo' };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/std', () => {
      const mocked = {
      asyncForEachWithLimit: vi.fn().mockResolvedValue(undefined),
      asyncMapWithLimit: vi.fn().mockResolvedValue([]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./cache/restore_ts_build_artifacts', () => {
      const mocked = {
      restoreTSBuildArtifacts: vi.fn(),
      resolveRestoreStrategy: vi.fn().mockResolvedValue({ shouldRestore: false, bestSha: undefined }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./cache/artifacts_state', () => {
      const mocked = {
      writeArtifactsState: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./cache/utils', () => {
      const mocked = {
      isCiEnvironment: vi.fn().mockReturnValue(false),
      resolveCurrentCommitSha: vi.fn().mockResolvedValue('head-sha'),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./tsc/run_tsc', () => {
      const mocked = {
      runTsc: vi.fn().mockResolvedValue(true),
      runTscFastPass: vi.fn().mockResolvedValue(true),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./tsc/root_refs_config', () => {
      const mocked = {
      updateRootRefsConfig: vi.fn(),
      ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./cache/clean_cache', () => {
      const mocked = {
      cleanCache: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./tsc/create_type_check_configs', () => {
      const mocked = {
      createTypeCheckConfigs: vi.fn().mockResolvedValue(new Set()),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./tsc/normalize_project_path', () => {
      const mocked = {
      normalizeProjectPath: vi.fn((p: string | undefined) => p),
    };
      return { ...mocked, default: mocked };
    });

const makeProject = (name: string, dir: string): TsProject =>
  ({
    path: `${dir}/tsconfig.json`,
    directory: `/repo/${dir}`,
    typeCheckConfigPath: `/repo/${dir}/tsconfig.type_check.json`,
    isTypeCheckDisabled: () => false,
    repoRel: dir,
    config: { compilerOptions: {} },
    getBase: () => undefined,
    getKbnRefs: () => [],
  } as unknown as TsProject);

vi.mock('@kbn/ts-projects', () => {
      const mocked = {
      TS_PROJECTS: [
        makeProject('streams_app', 'x-pack/plugins/streams_app'),
        makeProject('kbn-std', 'src/packages/kbn-std'),
        makeProject('kbn-utils', 'src/packages/kbn-utils'),
      ],
    };
      return { ...mocked, default: mocked };
    });

// Import the module AFTER all mocks are in place — this triggers the
// top-level `run()` call which we intercept via the mock above.
require('./run_type_check_cli');

const { run } = (await vi.importMock('@kbn/dev-cli-runner')) as {
  run: MockedFunction<(fn: Function, opts: unknown) => void>;
};

// `run` was called with (callback, options). Grab the callback.
const runCallback = run.mock.calls[0][0] as (ctx: {
  log: SomeDevLog;
  flagsReader: ReturnType<typeof makeFlagsReader>;
  procRunner: ReturnType<typeof createProcRunner>;
}) => Promise<void>;

const { isCiEnvironment, resolveCurrentCommitSha } = (await vi.importMock('./cache/utils')) as {
  isCiEnvironment: MockedFunction<() => boolean>;
  resolveCurrentCommitSha: MockedFunction<() => Promise<string | undefined>>;
};
const { restoreTSBuildArtifacts, resolveRestoreStrategy } = (await vi.importMock('./cache/restore_ts_build_artifacts')) as {
  restoreTSBuildArtifacts: MockedFunction<
    (
      log: SomeDevLog,
      sha?: string,
      options?: { skipExistingArtifactsCheck?: boolean }
    ) => Promise<void>
  >;
  resolveRestoreStrategy: MockedFunction<
    (
      log: SomeDevLog,
      projects: TsProject[]
    ) => Promise<
      | {
          shouldRestore: true;
          bestSha: string;
          staleProjects: string[];
          cacheServerAvailable: boolean;
          prNumber?: string;
          prTipSha?: string;
        }
      | { shouldRestore: false; bestSha?: undefined }
    >
  >;
};
const { writeArtifactsState } = (await vi.importMock('./cache/artifacts_state')) as {
  writeArtifactsState: MockedFunction<(sha: string) => Promise<void>>;
};
const { runTsc, runTscFastPass } = (await vi.importMock('./tsc/run_tsc')) as {
  runTsc: MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
  runTscFastPass: MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
};
const { cleanCache } = (await vi.importMock('./cache/clean_cache')) as {
  cleanCache: MockedFunction<() => Promise<void>>;
};
const { createTypeCheckConfigs } = (await vi.importMock('./tsc/create_type_check_configs')) as {
  createTypeCheckConfigs: MockedFunction<
    (
      log: SomeDevLog,
      projects: TsProject[],
      allProjects: TsProject[],
      opts?: { onlyCreateMissing?: boolean }
    ) => Promise<Set<string>>
  >;
};

const createLog = (): SomeDevLog =>
  ({
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  } as unknown as SomeDevLog);

const createProcRunner = () => ({
  run: vi.fn().mockResolvedValue(undefined),
});

const makeFlagsReader = (overrides: Record<string, unknown> = {}) => ({
  boolean: vi.fn((name: string) => overrides[name] ?? false),
  path: vi.fn((name: string) => (overrides[name] as string | undefined) ?? undefined),
  string: vi.fn((name: string) => (overrides[name] as string | undefined) ?? undefined),
});

describe('type_check orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCiEnvironment.mockReturnValue(false);
    resolveCurrentCommitSha.mockResolvedValue('head-sha');
    restoreTSBuildArtifacts.mockResolvedValue(undefined);
    resolveRestoreStrategy.mockResolvedValue({ shouldRestore: false, bestSha: undefined });
    writeArtifactsState.mockResolvedValue(undefined);
    runTsc.mockResolvedValue(true);
    runTscFastPass.mockResolvedValue(true);
    cleanCache.mockResolvedValue(undefined);
  });

  describe('early exits', () => {
    it('--restore-artifacts: restores artifacts via full discovery and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'restore-artifacts': '' });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log, undefined, {
        skipExistingArtifactsCheck: true,
      });
      expect(runTsc).not.toHaveBeenCalled();
      expect(runTscFastPass).not.toHaveBeenCalled();
    });

    it('--restore-artifacts=<sha>: restores the specific SHA and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'restore-artifacts': 'abc123def456' });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log, 'abc123def456', {
        skipExistingArtifactsCheck: true,
      });
      expect(runTsc).not.toHaveBeenCalled();
      expect(runTscFastPass).not.toHaveBeenCalled();
    });
  });

  describe('--clean-cache', () => {
    it('cleans caches and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'clean-cache': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(cleanCache).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith('Deleted all TypeScript caches.');
      expect(runTsc).not.toHaveBeenCalled();
      expect(runTscFastPass).not.toHaveBeenCalled();
    });
  });

  describe('smart restore (local)', () => {
    it('calls resolveRestoreStrategy and restores when shouldRestore is true', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({
        shouldRestore: true,
        bestSha: 'abc123def456',
        staleProjects: [],
        cacheServerAvailable: true,
      });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(resolveRestoreStrategy).toHaveBeenCalledWith(log, expect.any(Array));
      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log, 'abc123def456', {
        staleProjects: [],
        prNumber: undefined,
        prTipSha: undefined,
        skipCacheServer: false,
      });
    });

    it('skips restore when shouldRestore is false', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({ shouldRestore: false, bestSha: undefined });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).not.toHaveBeenCalled();
    });

    it('skips restore when bestSha is undefined even if shouldRestore is true', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({ shouldRestore: false, bestSha: undefined });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).not.toHaveBeenCalled();
      expect(createTypeCheckConfigs).toHaveBeenCalledWith(
        log,
        expect.any(Array),
        expect.any(Array),
        { preserveTimestampOnWrite: false }
      );
    });

    it('still resolves the restore strategy and restores when a --project filter is set', async () => {
      // A scoped run can face a cold cache too (e.g. a fresh worktree). The
      // restore decision is repo-wide and project-agnostic, so it must run
      // regardless of --project; otherwise a heavy closure rebuilds from scratch.
      resolveRestoreStrategy.mockResolvedValueOnce({
        shouldRestore: true,
        bestSha: 'abc123def456',
        staleProjects: [],
        cacheServerAvailable: true,
      });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({
        project: 'x-pack/plugins/streams_app/tsconfig.json',
      });

      await runCallback({ log, flagsReader, procRunner });

      expect(resolveRestoreStrategy).toHaveBeenCalledWith(log, expect.any(Array));
      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log, 'abc123def456', {
        staleProjects: [],
        prNumber: undefined,
        prTipSha: undefined,
        skipCacheServer: false,
      });
    });
  });

  describe('createTypeCheckConfigs options', () => {
    it('passes preserveTimestampOnWrite: true when artifacts were restored', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({
        shouldRestore: true,
        bestSha: 'abc123def456',
        staleProjects: [],
        cacheServerAvailable: true,
      });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(createTypeCheckConfigs).toHaveBeenCalledWith(
        log,
        expect.any(Array),
        expect.any(Array),
        { preserveTimestampOnWrite: true }
      );
    });

    it('passes preserveTimestampOnWrite: false when no restore was performed', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(createTypeCheckConfigs).toHaveBeenCalledWith(
        log,
        expect.any(Array),
        expect.any(Array),
        { preserveTimestampOnWrite: false }
      );
    });
  });

  describe('on CI', () => {
    it('always restores artifacts without running resolveRestoreStrategy', async () => {
      isCiEnvironment.mockReturnValue(true);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log);
      expect(resolveRestoreStrategy).not.toHaveBeenCalled();
    });

    it('skips the fail-fast pass and runs only the full pass', async () => {
      isCiEnvironment.mockReturnValue(true);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(runTscFastPass).not.toHaveBeenCalled();
      expect(runTsc).toHaveBeenCalledTimes(1);
    });
  });

  describe('not on CI', () => {
    it('with --project filter: runs only the full pass, skips the fail-fast pass', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({
        project: 'x-pack/plugins/streams_app/tsconfig.json',
      });

      await runCallback({ log, flagsReader, procRunner });

      expect(runTscFastPass).not.toHaveBeenCalled();
      expect(runTsc).toHaveBeenCalledTimes(1);
    });

    it('without --project filter: runs fail-fast pass then full pass', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(runTscFastPass).toHaveBeenCalledTimes(1);
      expect(runTsc).toHaveBeenCalledTimes(1);
    });

    it('fail-fast pass fails: skips the full pass and throws', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      runTscFastPass.mockResolvedValueOnce(false);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'Unable to build TS project refs'
      );

      expect(runTsc).not.toHaveBeenCalled();
    });

    it('full pass fails: throws createFailError', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      runTsc.mockResolvedValueOnce(false);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'Unable to build TS project refs'
      );
    });

    it('writes the HEAD SHA to the state file after the full pass succeeds', async () => {
      resolveCurrentCommitSha.mockResolvedValueOnce('abc123def456');

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(writeArtifactsState).toHaveBeenCalledWith('abc123def456');
    });

    it('writes the HEAD SHA to the state file even when the full pass fails', async () => {
      // Writing state on failure is intentional: tsc --build writes a fresh
      // .tsbuildinfo for every project it processes (including ones with errors).
      // If we skip the state write, the next run will call detectStaleArtifacts
      // from the old archive SHA, see all post-archive projects as stale, delete
      // their .tsbuildinfo via invalidateTsBuildInfoFiles, and force tsc to
      // rebuild them from scratch — including projects that already had 0 errors.
      resolveCurrentCommitSha.mockResolvedValueOnce('abc123def456');

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      runTsc.mockResolvedValueOnce(false);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow();

      expect(writeArtifactsState).toHaveBeenCalledWith('abc123def456');
    });

    it('does not write state file when --project filter is used', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({
        project: 'x-pack/plugins/streams_app/tsconfig.json',
      });

      await runCallback({ log, flagsReader, procRunner });

      expect(writeArtifactsState).not.toHaveBeenCalled();
    });
  });
});
