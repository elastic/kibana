/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import {
  restoreTSBuildArtifacts,
  resolveRestoreStrategy,
  computeEffectiveRebuildSet,
} from './restore_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import { GcsFileSystem } from './file_system/gcs_file_system';
import {
  buildCandidateShaList,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';

jest.mock('./utils', () => ({
  buildCandidateShaList: jest.fn(),
  getPullRequestNumber: jest.fn(),
  isCiEnvironment: jest.fn(),
  readRecentCommitShas: jest.fn(),
  readMainBranchCommitShas: jest.fn().mockResolvedValue([]),
  resolveCurrentCommitSha: jest.fn(),
  resolveUpstreamRemote: jest.fn(),
}));

jest.mock('./file_system/gcs_file_system', () => ({
  GcsFileSystem: jest.fn().mockImplementation(() => ({
    listAvailableCommitShas: jest.fn().mockResolvedValue({ shas: new Set(), elapsedMs: 0 }),
    restoreArchive: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('./cache_server_client', () => ({
  isCacheServerAvailable: jest.fn().mockResolvedValue(false),
  tryRestoreFromCacheServer: jest.fn().mockResolvedValue(false),
}));

jest.mock('./detect_stale_artifacts', () => ({
  detectStaleArtifacts: jest.fn().mockResolvedValue(new Set()),
}));

// Mock execa to simulate a fresh checkout (no existing build artifacts)
// and prevent actual git/gcloud commands from running during tests.
jest.mock('execa', () => jest.fn().mockResolvedValue({ stdout: '' }));

const mockedBuildCandidateShaList = buildCandidateShaList as jest.MockedFunction<
  typeof buildCandidateShaList
>;
const mockedGetPullRequestNumber = getPullRequestNumber as jest.MockedFunction<
  typeof getPullRequestNumber
>;
const mockedIsCiEnvironment = isCiEnvironment as jest.MockedFunction<typeof isCiEnvironment>;
const mockedReadRecentCommitShas = readRecentCommitShas as jest.MockedFunction<
  typeof readRecentCommitShas
>;
const mockedResolveCurrentCommitSha = resolveCurrentCommitSha as jest.MockedFunction<
  typeof resolveCurrentCommitSha
>;
const mockedResolveUpstreamRemote = resolveUpstreamRemote as jest.MockedFunction<
  typeof resolveUpstreamRemote
>;

const { detectStaleArtifacts } = jest.requireMock('./detect_stale_artifacts') as {
  detectStaleArtifacts: jest.MockedFunction<
    (opts: Record<string, unknown>) => Promise<Set<string>>
  >;
};

const createLog = (): SomeDevLog => {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as SomeDevLog;
};

const makeProject = (path: string, typeCheckConfigPath: string, refs: string[] = []): TsProject => {
  const allProjects: TsProject[] = [];
  const proj = {
    path,
    typeCheckConfigPath,
    isTypeCheckDisabled: () => false,
    getKbnRefs: () => refs.map((r) => allProjects.find((p) => p.path === r)).filter(Boolean),
  } as unknown as TsProject;
  allProjects.push(proj);
  return proj;
};

describe('restoreTSBuildArtifacts', () => {
  let restoreSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedGetPullRequestNumber.mockReturnValue(undefined);
    mockedResolveCurrentCommitSha.mockResolvedValue('');
    mockedReadRecentCommitShas.mockResolvedValue([]);
    mockedBuildCandidateShaList.mockReturnValue([]);
    mockedResolveUpstreamRemote.mockResolvedValue(undefined);
    // Mock readFile to return an empty project list for checkForExistingBuildArtifacts,
    // simulating a fresh checkout with no target/types directories.
    jest.spyOn(Fs.promises, 'readFile').mockResolvedValue(JSON.stringify([]));
    // Mock Fs.promises.access so the local cache path is considered reachable in tests.
    jest.spyOn(Fs.promises, 'access').mockResolvedValue(undefined);
    restoreSpy = jest
      .spyOn(LocalFileSystem.prototype, 'restoreArchive')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('logs when there is no commit history to restore', async () => {
    const log = createLog();

    mockedBuildCandidateShaList.mockReturnValueOnce([]);

    await restoreTSBuildArtifacts(log);

    expect(log.info).toHaveBeenCalledWith('[Cache] No commit history available for cache restore.');
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it('restores artifacts using the LocalFileSystem when candidates exist', async () => {
    const log = createLog();

    const candidateShas = ['sha-current', 'sha-parent'];
    mockedResolveCurrentCommitSha.mockResolvedValueOnce('sha-current');
    mockedReadRecentCommitShas.mockResolvedValueOnce(['sha-parent']);
    mockedBuildCandidateShaList.mockReturnValueOnce(candidateShas);
    mockedGetPullRequestNumber.mockReturnValueOnce('456');

    await restoreTSBuildArtifacts(log);

    expect(restoreSpy).toHaveBeenCalledTimes(1);
    expect(restoreSpy).toHaveBeenCalledWith({
      cacheInvalidationFiles: undefined,
      prNumber: '456',
      shas: candidateShas,
      skipClean: true,
    });
  });

  it('logs a warning when restoration throws', async () => {
    const log = createLog();

    mockedResolveCurrentCommitSha.mockResolvedValueOnce('shaX');
    mockedReadRecentCommitShas.mockResolvedValueOnce(['shaY']);
    mockedBuildCandidateShaList.mockReturnValueOnce(['shaX']);

    restoreSpy.mockRejectedValueOnce(new Error('boom'));

    await restoreTSBuildArtifacts(log);

    expect(log.warning).toHaveBeenCalledWith('[Cache] Failed to restore artifacts: boom');
  });

  describe('full-discovery GCS restore', () => {
    it('writes the state file after a successful GCS restore', async () => {
      const log = createLog();
      const restoredSha = 'abc123def456gh78';
      const candidateShas = [restoredSha, 'other-sha'];

      mockedResolveCurrentCommitSha.mockResolvedValueOnce(restoredSha);
      mockedReadRecentCommitShas.mockResolvedValueOnce(['other-sha']);
      mockedBuildCandidateShaList
        .mockReturnValueOnce(candidateShas) // outer candidateShas (early exit check)
        .mockReturnValueOnce(candidateShas); // resolveGcsMatchedShas internal candidates

      const mockGcsRestore = jest.fn().mockResolvedValue(restoredSha);
      (GcsFileSystem as jest.MockedClass<typeof GcsFileSystem>).mockImplementationOnce(
        () =>
          ({
            listAvailableCommitShas: jest
              .fn()
              .mockResolvedValue({ shas: new Set([restoredSha]), elapsedMs: 0 }),
            restoreArchive: mockGcsRestore,
          } as unknown as GcsFileSystem)
      );

      const mkdirSpy = jest.spyOn(Fs.promises, 'mkdir').mockResolvedValue(undefined);
      const writeFileSpy = jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined);

      await restoreTSBuildArtifacts(log);

      expect(mockGcsRestore).toHaveBeenCalledTimes(1);
      // State file must be written so subsequent runs don't treat the restored
      // artifacts as "unknown state" and trigger a redundant GCS restore.
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('kbn-ts-type-check-oblt-artifacts.sha'),
        restoredSha,
        'utf8'
      );
      expect(restoreSpy).not.toHaveBeenCalled();

      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });

  describe('direct restore (specificSha)', () => {
    it('calls gcsFs.restoreArchive with the specific SHA and skips existence check', async () => {
      const log = createLog();
      const mockGcsRestore = jest.fn().mockResolvedValue('abc123');

      (GcsFileSystem as jest.MockedClass<typeof GcsFileSystem>).mockImplementationOnce(
        () => ({ restoreArchive: mockGcsRestore } as unknown as GcsFileSystem)
      );

      const mkdirSpy = jest.spyOn(Fs.promises, 'mkdir').mockResolvedValue(undefined);
      const writeFileSpy = jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined);

      await restoreTSBuildArtifacts(log, 'abc123def456');

      expect(mockGcsRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          shas: ['abc123def456'],
          skipExistenceCheck: true,
        })
      );
      expect(restoreSpy).not.toHaveBeenCalled();

      // writeArtifactsState records the restored SHA for future staleness checks.
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('kbn-ts-type-check-oblt-artifacts.sha'),
        'abc123def456',
        'utf8'
      );

      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });
});

describe('resolveRestoreStrategy', () => {
  let gcsListMock: jest.Mock;
  let readFileSpy: jest.SpyInstance;
  let writeFileSpy: jest.SpyInstance;
  let mkdirSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;

  // Returns a readFile mock that returns a sha from the state file and a valid
  // tsconfig list from the config-paths.json file.
  const makeReadFileMock =
    (stateSha: string | null, configPaths = ['some/tsconfig.json']) =>
    async (filePath: Parameters<typeof Fs.promises.readFile>[0]) => {
      const p = filePath.toString();
      if (p.endsWith('kbn-ts-type-check-oblt-artifacts.sha')) {
        if (stateSha === null) {
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        }
        return stateSha;
      }
      return JSON.stringify(configPaths);
    };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedResolveCurrentCommitSha.mockResolvedValue('head-sha');
    mockedReadRecentCommitShas.mockResolvedValue(['head-sha', 'ancestor-sha']);
    mockedResolveUpstreamRemote.mockResolvedValue(undefined);
    mockedBuildCandidateShaList.mockReturnValue(['head-sha', 'ancestor-sha']);
    detectStaleArtifacts.mockResolvedValue(new Set());

    gcsListMock = jest.fn().mockResolvedValue({ shas: new Set(['ancestor-sha']), elapsedMs: 0 });
    (GcsFileSystem as jest.MockedClass<typeof GcsFileSystem>).mockImplementation(
      () =>
        ({
          listAvailableCommitShas: gcsListMock,
          restoreArchive: jest.fn().mockResolvedValue(undefined),
        } as unknown as GcsFileSystem)
    );

    // No local artifacts by default — empty config-paths.json, no state file.
    readFileSpy = jest
      .spyOn(Fs.promises, 'readFile')
      .mockImplementation(makeReadFileMock(null, []));
    writeFileSpy = jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined);
    mkdirSpy = jest.spyOn(Fs.promises, 'mkdir').mockResolvedValue(undefined);
    accessSpy = jest.spyOn(Fs.promises, 'access').mockRejectedValue(new Error('ENOENT'));
  });

  afterEach(() => {
    readFileSpy.mockRestore();
    writeFileSpy.mockRestore();
    mkdirSpy.mockRestore();
    accessSpy.mockRestore();
  });

  it('returns shouldRestore: true with bestSha when no local artifacts exist', async () => {
    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(true);
    expect(result.bestSha).toBe('ancestor-sha');
  });

  it('returns shouldRestore: false when no local artifacts exist and GCS has no archive', async () => {
    gcsListMock.mockResolvedValue({ shas: new Set(), elapsedMs: 0 });

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('returns shouldRestore: true with bestSha when local artifacts exist but state file is missing', async () => {
    // Artifacts exist on disk (access succeeds), but no state file (readFile throws ENOENT).
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock(null, ['some/tsconfig.json']));

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(true);
    expect(result.bestSha).toBe('ancestor-sha');
  });

  it('returns shouldRestore: false when local artifacts exist with unknown state and GCS has no archive', async () => {
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock(null, ['some/tsconfig.json']));
    gcsListMock.mockResolvedValue({ shas: new Set(), elapsedMs: 0 });

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('does NOT call GCS when local artifacts are up-to-date', async () => {
    // Artifacts exist on disk with a known state SHA, 0 stale projects.
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
    detectStaleArtifacts.mockResolvedValue(new Set());

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(gcsListMock).not.toHaveBeenCalled();
    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('does NOT call GCS when effective rebuild count is within threshold', async () => {
    // Artifacts exist on disk with a known state SHA.
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
    // 5 stale projects — below threshold of 10
    detectStaleArtifacts.mockResolvedValue(
      new Set(['p1', 'p2', 'p3', 'p4', 'p5'].map((p) => `/repo/${p}/tsconfig.type_check.json`))
    );

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(gcsListMock).not.toHaveBeenCalled();
    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('uses the local state SHA (not the GCS ancestor) for staleness detection', async () => {
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

    const log = createLog();
    await resolveRestoreStrategy(log, []);

    expect(detectStaleArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({ fromCommit: 'known-sha' })
    );
  });

  it('returns shouldRestore: false when above threshold but GCS has no matching archive', async () => {
    // Artifacts exist but >10 stale projects → triggers GCS lookup → GCS has nothing.
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
    gcsListMock.mockResolvedValue({ shas: new Set(), elapsedMs: 0 });
    detectStaleArtifacts.mockResolvedValue(
      new Set(Array.from({ length: 11 }, (_, i) => `/repo/p${i}/tsconfig.type_check.json`))
    );

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('restores when GCS archive reduces the effective rebuild count', async () => {
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

    // Local: 11 stale projects (above threshold).
    // GCS:    2 stale projects — restore is beneficial.
    detectStaleArtifacts
      .mockResolvedValueOnce(
        new Set(Array.from({ length: 11 }, (_, i) => `/repo/p${i}/tsconfig.type_check.json`))
      )
      .mockResolvedValueOnce(
        new Set([`/repo/p0/tsconfig.type_check.json`, `/repo/p1/tsconfig.type_check.json`])
      );

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(true);
    expect(result.bestSha).toBe('ancestor-sha');
  });

  it('skips restore when GCS archive would not reduce the effective rebuild count', async () => {
    // Scenario: user intentionally changed a foundational package. The GCS
    // archive is just as stale as the local artifacts — no point downloading.
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

    const staleSet = new Set(
      Array.from({ length: 11 }, (_, i) => `/repo/p${i}/tsconfig.type_check.json`)
    );
    // Both local and GCS checks return the same stale set.
    detectStaleArtifacts.mockResolvedValueOnce(staleSet).mockResolvedValueOnce(staleSet);

    const log = createLog();
    const result = await resolveRestoreStrategy(log, []);

    expect(result.shouldRestore).toBe(false);
    expect(result.bestSha).toBeUndefined();
  });

  it('accounts for transitive dependents when computing effective rebuild count', async () => {
    accessSpy.mockResolvedValue(undefined);
    readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

    // 1 directly stale project (foundation) but it has 10 dependents via the
    // reverse dep map — total effective count = 11 → triggers phase 3.
    // GCS check returns 0 stale projects → restore is beneficial.
    const foundationPath = '/repo/foundation/tsconfig.type_check.json';
    detectStaleArtifacts
      .mockResolvedValueOnce(new Set([foundationPath])) // local check
      .mockResolvedValueOnce(new Set()); // GCS check — GCS archive is fresh

    // Build 10 dependent projects that all depend on foundation.
    const dependents = Array.from({ length: 10 }, (_, i) =>
      makeProject(`/repo/dep${i}/tsconfig.json`, `/repo/dep${i}/tsconfig.type_check.json`)
    );
    const foundationProject = {
      path: '/repo/foundation/tsconfig.json',
      typeCheckConfigPath: foundationPath,
      isTypeCheckDisabled: () => false,
      getKbnRefs: () => [],
    } as unknown as TsProject;

    dependents.forEach((dep) => {
      (dep as any).getKbnRefs = () => [foundationProject];
    });

    const allProjects = [foundationProject, ...dependents];

    const log = createLog();
    const result = await resolveRestoreStrategy(log, allProjects);

    // 1 stale + 10 dependents = 11 > threshold; GCS has 0 → 0 < 11 → restore
    expect(result.shouldRestore).toBe(true);
  });
});

describe('computeEffectiveRebuildSet', () => {
  it('returns only the stale projects when they have no dependents', () => {
    const stale = new Set(['a', 'b']);
    const reverseDeps = new Map<string, Set<string>>();

    const result = computeEffectiveRebuildSet(stale, reverseDeps);

    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('includes direct dependents of stale projects', () => {
    const stale = new Set(['a']);
    const reverseDeps = new Map([['a', new Set(['b', 'c'])]]);

    const result = computeEffectiveRebuildSet(stale, reverseDeps);

    expect(result).toEqual(new Set(['a', 'b', 'c']));
  });

  it('includes transitive dependents via BFS', () => {
    const stale = new Set(['a']);
    const reverseDeps = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set(['d'])],
    ]);

    const result = computeEffectiveRebuildSet(stale, reverseDeps);

    expect(result).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('handles diamond dependencies without duplicates', () => {
    // a → b, c; b → d; c → d (diamond)
    const stale = new Set(['a']);
    const reverseDeps = new Map([
      ['a', new Set(['b', 'c'])],
      ['b', new Set(['d'])],
      ['c', new Set(['d'])],
    ]);

    const result = computeEffectiveRebuildSet(stale, reverseDeps);

    expect(result).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(result.size).toBe(4);
  });
});
