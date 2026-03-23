/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';

jest.mock('@kbn/dev-cli-runner', () => ({ run: jest.fn() }));
jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn((msg: string) => new Error(msg)),
}));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));
jest.mock('@kbn/std', () => ({
  asyncForEachWithLimit: jest.fn().mockResolvedValue(undefined),
  asyncMapWithLimit: jest.fn().mockResolvedValue([]),
}));

jest.mock('./cache/restore_ts_build_artifacts', () => ({
  restoreTSBuildArtifacts: jest.fn(),
  resolveRestoreStrategy: jest.fn().mockResolvedValue({ shouldRestore: false, bestSha: undefined }),
  writeArtifactsState: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./cache/utils', () => ({
  isCiEnvironment: jest.fn().mockReturnValue(false),
  resolveCurrentCommitSha: jest.fn().mockResolvedValue('head-sha'),
}));
jest.mock('./tsc/run_tsc', () => ({
  runTsc: jest.fn().mockResolvedValue(true),
  runTscFastPass: jest.fn().mockResolvedValue(true),
}));
jest.mock('./tsc/root_refs_config', () => ({
  updateRootRefsConfig: jest.fn(),
  ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
}));
jest.mock('./cache/clean_cache', () => ({
  cleanCache: jest.fn(),
}));
jest.mock('./tsc/create_type_check_configs', () => ({
  createTypeCheckConfigs: jest.fn().mockResolvedValue(new Set()),
}));
jest.mock('./tsc/normalize_project_path', () => ({
  normalizeProjectPath: jest.fn((p: string | undefined) => p),
}));

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

jest.mock('@kbn/ts-projects', () => ({
  TS_PROJECTS: [
    makeProject('streams_app', 'x-pack/plugins/streams_app'),
    makeProject('kbn-std', 'src/packages/kbn-std'),
    makeProject('kbn-utils', 'src/packages/kbn-utils'),
  ],
}));

// Import the module AFTER all mocks are in place — this triggers the
// top-level `run()` call which we intercept via the mock above.
require('./run_type_check_cli');

const { run } = jest.requireMock('@kbn/dev-cli-runner') as {
  run: jest.MockedFunction<(fn: Function, opts: unknown) => void>;
};

// `run` was called with (callback, options). Grab the callback.
const runCallback = run.mock.calls[0][0] as (ctx: {
  log: SomeDevLog;
  flagsReader: ReturnType<typeof makeFlagsReader>;
  procRunner: ReturnType<typeof createProcRunner>;
}) => Promise<void>;

const { isCiEnvironment, resolveCurrentCommitSha } = jest.requireMock('./cache/utils') as {
  isCiEnvironment: jest.MockedFunction<() => boolean>;
  resolveCurrentCommitSha: jest.MockedFunction<() => Promise<string | undefined>>;
};
const { restoreTSBuildArtifacts, resolveRestoreStrategy, writeArtifactsState } = jest.requireMock(
  './cache/restore_ts_build_artifacts'
) as {
  restoreTSBuildArtifacts: jest.MockedFunction<
    (
      log: SomeDevLog,
      sha?: string,
      options?: { skipExistingArtifactsCheck?: boolean }
    ) => Promise<void>
  >;
  resolveRestoreStrategy: jest.MockedFunction<
    (
      log: SomeDevLog,
      projects: TsProject[]
    ) => Promise<{ shouldRestore: boolean; bestSha: string | undefined }>
  >;
  writeArtifactsState: jest.MockedFunction<(sha: string) => Promise<void>>;
};
const { runTsc, runTscFastPass } = jest.requireMock('./tsc/run_tsc') as {
  runTsc: jest.MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
  runTscFastPass: jest.MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
};
const { cleanCache } = jest.requireMock('./cache/clean_cache') as {
  cleanCache: jest.MockedFunction<() => Promise<void>>;
};
const { createTypeCheckConfigs } = jest.requireMock('./tsc/create_type_check_configs') as {
  createTypeCheckConfigs: jest.MockedFunction<
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
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as SomeDevLog);

const createProcRunner = () => ({
  run: jest.fn().mockResolvedValue(undefined),
});

const makeFlagsReader = (overrides: Record<string, unknown> = {}) => ({
  boolean: jest.fn((name: string) => overrides[name] ?? false),
  path: jest.fn((name: string) => (overrides[name] as string | undefined) ?? undefined),
  string: jest.fn((name: string) => (overrides[name] as string | undefined) ?? undefined),
});

describe('type_check orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('smart restore (local, no --project)', () => {
    it('calls resolveRestoreStrategy and restores when shouldRestore is true', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({
        shouldRestore: true,
        bestSha: 'abc123def456',
      });

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(resolveRestoreStrategy).toHaveBeenCalledWith(log, expect.any(Array));
      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log, 'abc123def456', {
        staleProjects: undefined,
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
      resolveRestoreStrategy.mockResolvedValueOnce({ shouldRestore: true, bestSha: undefined });

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

    it('skips resolveRestoreStrategy when --project filter is set', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({
        project: 'x-pack/plugins/streams_app/tsconfig.json',
      });

      await runCallback({ log, flagsReader, procRunner });

      expect(resolveRestoreStrategy).not.toHaveBeenCalled();
      expect(restoreTSBuildArtifacts).not.toHaveBeenCalled();
    });
  });

  describe('createTypeCheckConfigs options', () => {
    it('passes preserveTimestampOnWrite: true when artifacts were restored', async () => {
      resolveRestoreStrategy.mockResolvedValueOnce({
        shouldRestore: true,
        bestSha: 'abc123def456',
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
