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
  selectBestArchive,
} from './restore_ts_build_artifacts';
import { PR_OVERHEAD } from './gcs_archive_resolver';
import { computeEffectiveRebuildSet } from './dependency_graph';
import { LocalFileSystem } from './file_system/local_file_system';
import { GcsFileSystem } from './file_system/gcs_file_system';
import {
  buildCandidateShaList,
  cleanTypeCheckArtifacts,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';

jest.mock('./utils', () => ({
  buildCandidateShaList: jest.fn(),
  cleanTypeCheckArtifacts: jest.fn().mockResolvedValue(undefined),
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
const mockedCleanTypeCheckArtifacts = cleanTypeCheckArtifacts as jest.MockedFunction<
  typeof cleanTypeCheckArtifacts
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
  let unlinkSpy: jest.SpyInstance;

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
    unlinkSpy = jest.spyOn(Fs.promises, 'unlink').mockResolvedValue(undefined);
  });

  afterEach(() => {
    readFileSpy.mockRestore();
    writeFileSpy.mockRestore();
    mkdirSpy.mockRestore();
    accessSpy.mockRestore();
    unlinkSpy.mockRestore();
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

  describe('Phase 1.5 — cache-invalidation file detection', () => {
    const mockedExeca = jest.requireMock('execa') as jest.Mock;

    it('cleans artifacts and resets state when invalidation files changed', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

      // Phase 1.5: yarn.lock changed; Phase 1.5 GCS archive check: also changed.
      mockedExeca
        .mockResolvedValueOnce({ stdout: 'yarn.lock\n' })
        .mockResolvedValueOnce({ stdout: 'yarn.lock\n' });

      const log = createLog();
      await resolveRestoreStrategy(log, []);

      expect(mockedCleanTypeCheckArtifacts).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('kbn-ts-type-check-oblt-artifacts.sha'),
        '',
        'utf8'
      );
    });

    it('restores from a compatible GCS archive when local artifacts were invalidated', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

      // Phase 1.5: local state stale; GCS archive built after the change — clean.
      mockedExeca
        .mockResolvedValueOnce({ stdout: 'yarn.lock\n' })
        .mockResolvedValueOnce({ stdout: '' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(mockedCleanTypeCheckArtifacts).toHaveBeenCalledTimes(1);
      expect(result.shouldRestore).toBe(true);
      expect(result.bestSha).toBe('ancestor-sha');
    });

    it('falls back to cold rebuild when GCS archive also predates the invalidating change', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

      // Both local state and GCS archive predate the yarn.lock change.
      mockedExeca
        .mockResolvedValueOnce({ stdout: 'yarn.lock\n' })
        .mockResolvedValueOnce({ stdout: 'yarn.lock\n' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(result.bestSha).toBeUndefined();
    });

    it('falls back to cold rebuild when GCS has no archive after local invalidation', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      gcsListMock.mockResolvedValue({ shas: new Set(), elapsedMs: 0 });

      mockedExeca.mockResolvedValueOnce({ stdout: '.nvmrc\n' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(result.bestSha).toBeUndefined();
    });

    it('does not reach Phase 2 (detectStaleArtifacts) when invalidation files changed', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

      // Phase 1.5: stale; GCS archive also stale → cold rebuild, no Phase 2.
      mockedExeca
        .mockResolvedValueOnce({ stdout: '.nvmrc\n' })
        .mockResolvedValueOnce({ stdout: '.nvmrc\n' });

      const log = createLog();
      await resolveRestoreStrategy(log, []);

      expect(detectStaleArtifacts).not.toHaveBeenCalled();
    });

    it('proceeds to Phase 2 when no invalidation files changed', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      // execa default returns { stdout: '' } — no changed files.

      const log = createLog();
      await resolveRestoreStrategy(log, []);

      expect(mockedCleanTypeCheckArtifacts).not.toHaveBeenCalled();
      expect(detectStaleArtifacts).toHaveBeenCalled();
    });
  });

  describe('.tsbuildinfo invalidation', () => {
    const staleProjectPaths = ['p1', 'p2', 'p3', 'p4', 'p5'].map(
      (p) => `/repo/${p}/tsconfig.type_check.json`
    );
    const expectedUnlinkPaths = staleProjectPaths.map(
      (p) => `/repo/${p.split('/')[2]}/target/types/tsconfig.type_check.tsbuildinfo`
    );

    it('invalidates .tsbuildinfo for stale projects within the rebuild threshold', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      detectStaleArtifacts.mockResolvedValue(new Set(staleProjectPaths));

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      // One unlink call per stale project's .tsbuildinfo.
      expect(unlinkSpy).toHaveBeenCalledTimes(staleProjectPaths.length);
      for (const expectedPath of expectedUnlinkPaths) {
        expect(unlinkSpy).toHaveBeenCalledWith(expectedPath);
      }
    });

    it('invalidates .tsbuildinfo when above threshold but GCS has no matching archive', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      gcsListMock.mockResolvedValue({ shas: new Set(), elapsedMs: 0 });
      const largeStalePaths = Array.from(
        { length: 11 },
        (_, i) => `/repo/p${i}/tsconfig.type_check.json`
      );
      detectStaleArtifacts.mockResolvedValue(new Set(largeStalePaths));

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(unlinkSpy).toHaveBeenCalledTimes(largeStalePaths.length);
    });

    it('invalidates .tsbuildinfo when GCS archive does not reduce the rebuild count', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      const largeStalePaths = Array.from(
        { length: 11 },
        (_, i) => `/repo/p${i}/tsconfig.type_check.json`
      );
      const staleSet = new Set(largeStalePaths);
      // Both local and GCS checks return the same stale set → GCS won't help.
      detectStaleArtifacts.mockResolvedValueOnce(staleSet).mockResolvedValueOnce(staleSet);

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(unlinkSpy).toHaveBeenCalledTimes(largeStalePaths.length);
    });

    it('does NOT invalidate .tsbuildinfo when artifacts are fully up-to-date', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));
      detectStaleArtifacts.mockResolvedValue(new Set());

      const log = createLog();
      await resolveRestoreStrategy(log, []);

      expect(unlinkSpy).not.toHaveBeenCalled();
    });
  });

  describe('GCS archive node_modules safety check', () => {
    const mockedExeca = jest.requireMock('execa') as jest.Mock;

    it('skips restore when no local artifacts exist but archive has a node_modules change', async () => {
      // Default beforeEach: no local artifacts, GCS has 'ancestor-sha'.
      // Simulate yarn.lock changing between ancestor-sha and HEAD.
      mockedExeca.mockResolvedValueOnce({ stdout: 'yarn.lock\n' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(result.bestSha).toBeUndefined();
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('ancestor-sha'));
    });

    it('skips restore when local state is unknown but archive has a node_modules change', async () => {
      // Artifacts exist on disk, but no state SHA.
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock(null, ['some/tsconfig.json']));

      // Simulate .nvmrc changing between ancestor-sha and HEAD.
      mockedExeca.mockResolvedValueOnce({ stdout: '.nvmrc\n' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(result.bestSha).toBeUndefined();
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('ancestor-sha'));
    });

    it('skips restore in Phase 3 when GCS archive reduces count but has a node_modules change', async () => {
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockImplementation(makeReadFileMock('known-sha', ['some/tsconfig.json']));

      // Local: 11 stale projects (above threshold), GCS: 2 stale → GCS would help.
      detectStaleArtifacts
        .mockResolvedValueOnce(
          new Set(Array.from({ length: 11 }, (_, i) => `/repo/p${i}/tsconfig.type_check.json`))
        )
        .mockResolvedValueOnce(
          new Set([`/repo/p0/tsconfig.type_check.json`, `/repo/p1/tsconfig.type_check.json`])
        );

      // Phase 1.5 git diff (localStateSha → HEAD): clean.
      mockedExeca.mockResolvedValueOnce({ stdout: '' });
      // Phase 3 archive validity check (ancestor-sha → HEAD): yarn.lock changed.
      mockedExeca.mockResolvedValueOnce({ stdout: 'yarn.lock\n' });

      const log = createLog();
      const result = await resolveRestoreStrategy(log, []);

      expect(result.shouldRestore).toBe(false);
      expect(result.bestSha).toBeUndefined();
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('ancestor-sha'));
    });
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

// ── selectBestArchive ──────────────────────────────────────────────────────

jest.mock('./gcs_archive_resolver', () => ({
  ...jest.requireActual('./gcs_archive_resolver'),
  computeEffectiveRebuildCountFromSha: jest.fn(),
}));

import { computeEffectiveRebuildCountFromSha } from './gcs_archive_resolver';

const mockedStaleness = computeEffectiveRebuildCountFromSha as jest.MockedFunction<
  typeof computeEffectiveRebuildCountFromSha
>;

function makeLog(): SomeDevLog {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

const COMMIT = { sha: 'commit000000' };
const PR = {
  sha: 'prmerge00000',
  prNumber: '12345',
  prTipSha: 'prtip0000000',
  prBuildFileHashes: { 'yarn.lock': 'abc123' },
};

describe('selectBestArchive', () => {
  const noProjects: TsProject[] = [];

  beforeEach(() => {
    mockedStaleness.mockReset();
  });

  it('returns undefined when no candidates', async () => {
    const result = await selectBestArchive({}, noProjects, makeLog());
    expect(result).toBeUndefined();
  });

  it('returns commit archive when no PR archive', async () => {
    mockedStaleness.mockResolvedValue(5);
    const result = await selectBestArchive({ commitArchive: COMMIT }, noProjects, makeLog());
    expect(result).toBe(COMMIT);
    expect(mockedStaleness).not.toHaveBeenCalled(); // no comparison needed
  });

  it('returns PR archive when no commit archive', async () => {
    const result = await selectBestArchive({ prArchive: PR }, noProjects, makeLog());
    expect(result).toBe(PR);
    expect(mockedStaleness).not.toHaveBeenCalled();
  });

  it('prefers commit archive when it has lower staleness than the PR archive', async () => {
    // commit: 1 source-stale → cost 1
    // PR: 3 source-stale + 0 graph + PR_OVERHEAD (0) → cost 3
    mockedStaleness
      .mockResolvedValueOnce(1) // commit
      .mockResolvedValueOnce(3); // PR

    const log = makeLog();
    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: PR },
      noProjects,
      log
    );

    expect(result).toBe(COMMIT);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Commit archive selected'));
  });

  it('prefers PR archive when it is significantly cheaper than commit archive', async () => {
    // commit: 80 source-stale → cost 80
    // PR: 1 source-stale + 0 graph + PR_OVERHEAD (0) → cost 1
    mockedStaleness
      .mockResolvedValueOnce(80) // commit
      .mockResolvedValueOnce(1); // PR

    const log = makeLog();
    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: PR },
      noProjects,
      log
    );

    expect(result).toBe(PR);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('PR archive selected'));
  });

  it('PR archive with graph staleness is penalised correctly', async () => {
    // commit: 10 source-stale → cost 10
    // PR: 1 source-stale + (2 added packages × 15) + PR_OVERHEAD (0)
    //   = 1 + 30 + 0 = 31 → commit wins
    const prWithGraph = {
      ...PR,
      projectGraphDiff: { added: ['pkg/a/kibana.jsonc', 'pkg/b/kibana.jsonc'], removed: [] },
    };
    mockedStaleness
      .mockResolvedValueOnce(10) // commit
      .mockResolvedValueOnce(1); // PR

    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: prWithGraph },
      noProjects,
      makeLog()
    );

    expect(result).toBe(COMMIT);
  });

  it('PR archive with graph staleness can still win if commit is much more stale', async () => {
    // commit: 200 source-stale → cost 200
    // PR: 1 source-stale + (2 × 15) + PR_OVERHEAD (0) = 31 → PR wins
    const prWithGraph = {
      ...PR,
      projectGraphDiff: { added: ['pkg/a/kibana.jsonc', 'pkg/b/kibana.jsonc'], removed: [] },
    };
    mockedStaleness
      .mockResolvedValueOnce(200) // commit
      .mockResolvedValueOnce(1); // PR

    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: prWithGraph },
      noProjects,
      makeLog()
    );

    expect(result).toBe(prWithGraph);
  });

  it('commit archive wins when PR staleness is unknown', async () => {
    mockedStaleness
      .mockResolvedValueOnce(5) // commit — known
      .mockResolvedValueOnce(undefined); // PR — unknown

    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: PR },
      noProjects,
      makeLog()
    );

    expect(result).toBe(COMMIT);
  });

  it('PR archive is used when commit staleness is unknown', async () => {
    mockedStaleness
      .mockResolvedValueOnce(undefined) // commit — unknown
      .mockResolvedValueOnce(1); // PR — known

    const result = await selectBestArchive(
      { commitArchive: COMMIT, prArchive: PR },
      noProjects,
      makeLog()
    );

    expect(result).toBe(PR);
  });

  it(`the comparison log shows the three PR cost components`, async () => {
    mockedStaleness
      .mockResolvedValueOnce(9) // commit
      .mockResolvedValueOnce(1); // PR

    const log = makeLog();
    await selectBestArchive({ commitArchive: COMMIT, prArchive: PR }, noProjects, log);

    const logCall = (log.info as jest.Mock).mock.calls
      .flat()
      .find((msg: string) => msg.includes('PR overhead'));
    expect(logCall).toContain(`${PR_OVERHEAD} PR overhead`);
    expect(logCall).toContain('1 source-stale');
  });
});
