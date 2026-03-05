/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { restoreTSBuildArtifacts } from './restore_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getGcloudAccessToken,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';

jest.mock('./utils', () => ({
  buildCandidateShaList: jest.fn(),
  getGcloudAccessToken: jest.fn(),
  getPullRequestNumber: jest.fn(),
  isCiEnvironment: jest.fn(),
  readRecentCommitShas: jest.fn(),
  resolveCurrentCommitSha: jest.fn(),
  resolveUpstreamRemote: jest.fn(),
  withGcsAuth: jest.fn((_, action: (token: string) => Promise<unknown>) => action('mock-token')),
}));

jest.mock('./file_system/gcs_file_system', () => ({
  GcsFileSystem: jest.fn().mockImplementation(() => ({
    restoreArchive: jest.fn(),
  })),
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
const mockedGetGcloudAccessToken = getGcloudAccessToken as jest.MockedFunction<
  typeof getGcloudAccessToken
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

const createLog = (): SomeDevLog => {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as SomeDevLog;
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
    mockedGetGcloudAccessToken.mockResolvedValue(undefined);
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

    expect(log.info).toHaveBeenCalledWith(
      'No commit history available for TypeScript cache restore.'
    );
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

    restoreSpy.mockRejectedValueOnce(new Error('boom')); // ensure throw

    await restoreTSBuildArtifacts(log);

    expect(log.warning).toHaveBeenCalledWith('Failed to restore TypeScript build artifacts: boom');
  });
});
