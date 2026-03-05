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

jest.mock('./src/archive/archive_ts_build_artifacts', () => ({
  archiveTSBuildArtifacts: jest.fn(),
}));
jest.mock('./src/archive/restore_ts_build_artifacts', () => ({
  restoreTSBuildArtifacts: jest.fn(),
  readArtifactsState: jest.fn().mockResolvedValue({ restoredSha: 'archive-sha-1234567890ab' }),
  writeArtifactsState: jest.fn(),
}));
jest.mock('./src/archive/utils', () => ({
  detectLocalChanges: jest.fn().mockResolvedValue(false),
  isCiEnvironment: jest.fn().mockReturnValue(false),
  resolveCurrentCommitSha: jest.fn().mockResolvedValue('head-sha-1234567890ab'),
}));
jest.mock('./src/run_tsc', () => ({
  runTsc: jest.fn().mockResolvedValue(true),
  runTscFastPass: jest.fn().mockResolvedValue(true),
}));
jest.mock('./root_refs_config', () => ({
  updateRootRefsConfig: jest.fn(),
  ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
}));
jest.mock('./src/detect_stale_artifacts', () => ({
  detectStaleArtifacts: jest.fn().mockResolvedValue(new Set()),
}));
jest.mock('./src/clean_cache', () => ({
  cleanCache: jest.fn(),
}));
jest.mock('./src/create_type_check_configs', () => ({
  createTypeCheckConfigs: jest.fn().mockResolvedValue(new Set()),
}));
jest.mock('./src/normalize_project_path', () => ({
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

const { isCiEnvironment, detectLocalChanges, resolveCurrentCommitSha } = jest.requireMock(
  './src/archive/utils'
) as {
  isCiEnvironment: jest.MockedFunction<() => boolean>;
  detectLocalChanges: jest.MockedFunction<() => Promise<boolean>>;
  resolveCurrentCommitSha: jest.MockedFunction<() => Promise<string>>;
};
const { restoreTSBuildArtifacts, readArtifactsState, writeArtifactsState } = jest.requireMock(
  './src/archive/restore_ts_build_artifacts'
) as {
  restoreTSBuildArtifacts: jest.MockedFunction<(log: SomeDevLog) => Promise<void>>;
  readArtifactsState: jest.MockedFunction<() => Promise<{ restoredSha: string } | undefined>>;
  writeArtifactsState: jest.MockedFunction<(sha: string) => Promise<void>>;
};
const { archiveTSBuildArtifacts } = jest.requireMock(
  './src/archive/archive_ts_build_artifacts'
) as {
  archiveTSBuildArtifacts: jest.MockedFunction<(log: SomeDevLog) => Promise<void>>;
};
const { runTsc, runTscFastPass } = jest.requireMock('./src/run_tsc') as {
  runTsc: jest.MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
  runTscFastPass: jest.MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
};
const { detectStaleArtifacts } = jest.requireMock('./src/detect_stale_artifacts') as {
  detectStaleArtifacts: jest.MockedFunction<
    (opts: Record<string, unknown>) => Promise<Set<string>>
  >;
};
const { cleanCache } = jest.requireMock('./src/clean_cache') as {
  cleanCache: jest.MockedFunction<() => Promise<void>>;
};
const { createTypeCheckConfigs } = jest.requireMock('./src/create_type_check_configs') as {
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
    detectLocalChanges.mockResolvedValue(false);
    resolveCurrentCommitSha.mockResolvedValue('head-sha-1234567890ab');
    restoreTSBuildArtifacts.mockResolvedValue(undefined);
    archiveTSBuildArtifacts.mockResolvedValue(undefined);
    writeArtifactsState.mockResolvedValue(undefined);
    readArtifactsState.mockResolvedValue({ restoredSha: 'archive-sha-1234567890ab' });
    detectStaleArtifacts.mockResolvedValue(new Set());
    runTsc.mockResolvedValue(true);
    runTscFastPass.mockResolvedValue(true);
    cleanCache.mockResolvedValue(undefined);
  });

  describe('early exits', () => {
    it('--restore-artifacts: restores artifacts and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'restore-artifacts': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log);
      expect(runTsc).not.toHaveBeenCalled();
      expect(runTscFastPass).not.toHaveBeenCalled();
    });
  });

  describe('--clean-cache', () => {
    it('cleans caches and continues to run the type check', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'clean-cache': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(cleanCache).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith('Deleted all TypeScript caches');
      expect(runTsc).toHaveBeenCalledTimes(1);
    });
  });

  describe('stale artifact detection', () => {
    it('skips stale detection and continues to type check when no artifact state is recorded on disk', async () => {
      readArtifactsState.mockResolvedValueOnce(undefined);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(detectStaleArtifacts).not.toHaveBeenCalled();
      expect(runTsc).toHaveBeenCalledTimes(1);
    });

    it('logs up-to-date when no projects are stale', async () => {
      detectStaleArtifacts.mockResolvedValueOnce(new Set());

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('All artifacts are up-to-date')
      );
    });

    it('logs stale project paths when artifacts are stale', async () => {
      detectStaleArtifacts.mockResolvedValueOnce(
        new Set(['/repo/x-pack/plugins/streams_app/tsconfig.type_check.json'])
      );

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('1 project'));
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('x-pack/plugins/streams_app'));
    });
  });

  describe('createTypeCheckConfigs options', () => {
    it('passes onlyCreateMissing: true when --with-archive is set', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(createTypeCheckConfigs).toHaveBeenCalledWith(
        log,
        expect.any(Array),
        expect.any(Array),
        { onlyCreateMissing: true }
      );
    });

    it('passes onlyCreateMissing: false when --with-archive is not set', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      await runCallback({ log, flagsReader, procRunner });

      expect(createTypeCheckConfigs).toHaveBeenCalledWith(
        log,
        expect.any(Array),
        expect.any(Array),
        { onlyCreateMissing: false }
      );
    });
  });

  describe('--with-archive', () => {
    it('restores artifacts before the type check', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log);
    });

    it('archives artifacts and updates state after type check', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(archiveTSBuildArtifacts).toHaveBeenCalledWith(log);
      expect(writeArtifactsState).toHaveBeenCalledWith('head-sha-1234567890ab');
    });

    it('always updates the state file even when the working tree is dirty (local dev)', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      detectLocalChanges.mockResolvedValue(true);

      await runCallback({ log, flagsReader, procRunner });

      expect(writeArtifactsState).toHaveBeenCalledWith('head-sha-1234567890ab');
    });

    it('throws on CI when local changes are detected, skipping the archive', async () => {
      isCiEnvironment.mockReturnValue(true);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      detectLocalChanges.mockResolvedValue(true);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'uncommitted changes'
      );

      expect(archiveTSBuildArtifacts).not.toHaveBeenCalled();
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
  });

  describe('on CI', () => {
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
});
