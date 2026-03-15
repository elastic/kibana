/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import {
  buildCandidateShaList,
  getGcloudAccessToken,
  getPullRequestNumber,
  isCiEnvironment,
  isGcloudAvailable,
  resolveCurrentCommitSha,
  resolveUpstreamRemote,
} from './utils';

jest.mock('execa');
const mockedExeca = execa as jest.MockedFunction<typeof execa>;

describe('utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getPullRequestNumber', () => {
    it('returns undefined when BUILDKITE_PULL_REQUEST is not set', () => {
      delete process.env.BUILDKITE_PULL_REQUEST;
      expect(getPullRequestNumber()).toBeUndefined();
    });

    it('returns undefined when BUILDKITE_PULL_REQUEST is empty', () => {
      process.env.BUILDKITE_PULL_REQUEST = '';
      expect(getPullRequestNumber()).toBeUndefined();
    });

    it('returns undefined when BUILDKITE_PULL_REQUEST is "false"', () => {
      process.env.BUILDKITE_PULL_REQUEST = 'false';
      expect(getPullRequestNumber()).toBeUndefined();
    });

    it('returns the PR number when set', () => {
      process.env.BUILDKITE_PULL_REQUEST = '12345';
      expect(getPullRequestNumber()).toBe('12345');
    });
  });

  describe('isCiEnvironment', () => {
    it('returns false when CI is not set', () => {
      delete process.env.CI;
      expect(isCiEnvironment()).toBe(false);
    });

    it('returns false when CI is empty', () => {
      process.env.CI = '';
      expect(isCiEnvironment()).toBe(false);
    });

    it('returns true when CI is "true"', () => {
      process.env.CI = 'true';
      expect(isCiEnvironment()).toBe(true);
    });

    it('returns true when CI is "TRUE" (case-insensitive)', () => {
      process.env.CI = 'TRUE';
      expect(isCiEnvironment()).toBe(true);
    });

    it('returns false for other values', () => {
      process.env.CI = '1';
      expect(isCiEnvironment()).toBe(false);
    });
  });

  describe('resolveCurrentCommitSha', () => {
    it('returns BUILDKITE_COMMIT when set', async () => {
      process.env.BUILDKITE_COMMIT = 'abc123';
      expect(await resolveCurrentCommitSha()).toBe('abc123');
      expect(mockedExeca).not.toHaveBeenCalled();
    });

    it('falls back to git rev-parse HEAD when BUILDKITE_COMMIT is not set', async () => {
      delete process.env.BUILDKITE_COMMIT;
      mockedExeca.mockResolvedValueOnce({ stdout: 'def456\n' } as any);
      expect(await resolveCurrentCommitSha()).toBe('def456');
      expect(mockedExeca).toHaveBeenCalledWith('git', ['rev-parse', 'HEAD'], expect.any(Object));
    });

    it('returns undefined when git returns empty output', async () => {
      delete process.env.BUILDKITE_COMMIT;
      mockedExeca.mockResolvedValueOnce({ stdout: '' } as any);
      expect(await resolveCurrentCommitSha()).toBeUndefined();
    });
  });

  describe('buildCandidateShaList', () => {
    it('returns empty array when no current SHA and no history', () => {
      expect(buildCandidateShaList(undefined, [])).toEqual([]);
    });

    it('includes only the current SHA when history is empty', () => {
      expect(buildCandidateShaList('sha1', [])).toEqual(['sha1']);
    });

    it('includes history SHAs when current SHA is undefined', () => {
      expect(buildCandidateShaList(undefined, ['sha1', 'sha2'])).toEqual(['sha1', 'sha2']);
    });

    it('puts current SHA first', () => {
      const result = buildCandidateShaList('current', ['hist1', 'hist2']);
      expect(result[0]).toBe('current');
      expect(result).toEqual(['current', 'hist1', 'hist2']);
    });

    it('deduplicates SHAs', () => {
      const result = buildCandidateShaList('sha1', ['sha1', 'sha2', 'sha2', 'sha3']);
      expect(result).toEqual(['sha1', 'sha2', 'sha3']);
    });

    it('filters out empty strings from history', () => {
      const result = buildCandidateShaList('sha1', ['', 'sha2', '']);
      expect(result).toEqual(['sha1', 'sha2']);
    });
  });

  describe('resolveUpstreamRemote', () => {
    it('returns the remote name for an SSH elastic/kibana URL', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: [
          'origin\tgit@github.com:coenwarmer/kibana.git (fetch)',
          'origin\tgit@github.com:coenwarmer/kibana.git (push)',
          'upstream\tgit@github.com:elastic/kibana.git (fetch)',
          'upstream\tgit@github.com:elastic/kibana.git (push)',
        ].join('\n'),
      } as any);

      expect(await resolveUpstreamRemote()).toBe('upstream');
    });

    it('returns the remote name for an HTTPS elastic/kibana URL', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: [
          'origin\thttps://github.com/myuser/kibana.git (fetch)',
          'elastic\thttps://github.com/elastic/kibana.git (fetch)',
        ].join('\n'),
      } as any);

      expect(await resolveUpstreamRemote()).toBe('elastic');
    });

    it('returns "origin" when origin points to elastic/kibana directly', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: 'origin\tgit@github.com:elastic/kibana.git (fetch)\n',
      } as any);

      expect(await resolveUpstreamRemote()).toBe('origin');
    });

    it('matches URLs without .git suffix', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: 'upstream\thttps://github.com/elastic/kibana (fetch)\n',
      } as any);

      expect(await resolveUpstreamRemote()).toBe('upstream');
    });

    it('returns undefined when no remote points to elastic/kibana', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: [
          'origin\tgit@github.com:myuser/kibana.git (fetch)',
          'other\tgit@github.com:otheruser/kibana.git (fetch)',
        ].join('\n'),
      } as any);

      expect(await resolveUpstreamRemote()).toBeUndefined();
    });

    it('returns undefined when git command fails', async () => {
      mockedExeca.mockRejectedValueOnce(new Error('git not found'));
      expect(await resolveUpstreamRemote()).toBeUndefined();
    });
  });

  describe('getGcloudAccessToken', () => {
    it('returns the access token when gcloud succeeds', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: 'ya29.some-token\n',
      } as any);

      expect(await getGcloudAccessToken()).toBe('ya29.some-token');
      expect(mockedExeca).toHaveBeenCalledWith(
        'gcloud',
        ['auth', 'print-access-token'],
        expect.any(Object)
      );
    });

    it('returns undefined when gcloud returns empty output', async () => {
      mockedExeca.mockResolvedValueOnce({ stdout: '' } as any);
      expect(await getGcloudAccessToken()).toBeUndefined();
    });

    it('returns undefined when gcloud is not installed', async () => {
      mockedExeca.mockRejectedValueOnce(new Error('command not found: gcloud'));
      expect(await getGcloudAccessToken()).toBeUndefined();
    });
  });

  describe('isGcloudAvailable', () => {
    it('returns true when getGcloudAccessToken returns a token', async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: 'ya29.some-token',
      } as any);

      expect(await isGcloudAvailable()).toBe(true);
    });

    it('returns false when getGcloudAccessToken fails', async () => {
      mockedExeca.mockRejectedValueOnce(new Error('not authed'));
      expect(await isGcloudAvailable()).toBe(false);
    });
  });
});
