/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentDownloadUrl, getAgentFileName } from '../common/fleet_services';
import { downloadAndStoreAgent } from '../common/agent_downloads_service';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentDownloaderRunner } from './agent_downloader';
import type { RunContext } from '@kbn/dev-cli-runner';

jest.mock('../common/fleet_services');
jest.mock('../common/agent_downloads_service');

describe('agentDownloaderRunner', () => {
  let log: ToolingLog;

  beforeEach(() => {
    log = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;

    jest.clearAllMocks();
  });

  const version = '8.15.0';
  let closestMatch = false;
  const url = 'http://example.com/agent.tar.gz';
  const fileName = 'elastic-agent-8.15.0.tar.gz';

  it('downloads and stores the specified version', async () => {
    (getAgentDownloadUrl as jest.Mock).mockResolvedValue({ url });
    (getAgentFileName as jest.Mock).mockReturnValue('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock).mockResolvedValue(undefined);

    await agentDownloaderRunner({
      flags: { version, closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledWith(version, closestMatch, log);
    expect(getAgentFileName).toHaveBeenCalledWith(version);
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, fileName);
    expect(log.info).toHaveBeenCalledWith('Successfully downloaded and stored version 8.15.0');
  });

  it('logs an error if the download fails', async () => {
    (getAgentDownloadUrl as jest.Mock).mockResolvedValue({ url });
    (getAgentFileName as jest.Mock).mockReturnValue('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock).mockRejectedValue(new Error('Download failed'));

    await agentDownloaderRunner({
      flags: { version, closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledWith(version, closestMatch, log);
    expect(getAgentFileName).toHaveBeenCalledWith(version);
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, fileName);
    expect(log.error).toHaveBeenCalledWith(
      'Failed to download or store version 8.15.0: Download failed'
    );
  });

  it('downloads and stores the previous patch version if the specified version fails', async () => {
    const fallbackVersion = '8.15.0';
    const fallbackFileName = 'elastic-agent-8.15.0.tar.gz';

    (getAgentDownloadUrl as jest.Mock)
      .mockResolvedValueOnce({ url })
      .mockResolvedValueOnce({ url });
    (getAgentFileName as jest.Mock)
      .mockReturnValueOnce('elastic-agent-8.15.1')
      .mockReturnValueOnce('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock)
      .mockRejectedValueOnce(new Error('Download failed'))
      .mockResolvedValueOnce(undefined);

    await agentDownloaderRunner({
      flags: { version: '8.15.1', closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledWith('8.15.1', closestMatch, log);
    expect(getAgentDownloadUrl).toHaveBeenCalledWith(fallbackVersion, closestMatch, log);
    expect(getAgentFileName).toHaveBeenCalledWith('8.15.1');
    expect(getAgentFileName).toHaveBeenCalledWith(fallbackVersion);
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, 'elastic-agent-8.15.1.tar.gz');
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, fallbackFileName);
    expect(log.error).toHaveBeenCalledWith(
      'Failed to download or store version 8.15.1: Download failed'
    );
    expect(log.info).toHaveBeenCalledWith('Successfully downloaded and stored version 8.15.0');
  });

  it('logs an error if all downloads fail', async () => {
    (getAgentDownloadUrl as jest.Mock).mockResolvedValue({ url });
    (getAgentFileName as jest.Mock)
      .mockReturnValueOnce('elastic-agent-8.15.1')
      .mockReturnValueOnce('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock)
      .mockRejectedValueOnce(new Error('Download failed'))
      .mockRejectedValueOnce(new Error('Download failed'));

    await agentDownloaderRunner({
      flags: { version: '8.15.1', closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledWith('8.15.1', closestMatch, log);
    expect(getAgentDownloadUrl).toHaveBeenCalledWith('8.15.0', closestMatch, log);
    expect(getAgentFileName).toHaveBeenCalledWith('8.15.1');
    expect(getAgentFileName).toHaveBeenCalledWith('8.15.0');
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, 'elastic-agent-8.15.1.tar.gz');
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, 'elastic-agent-8.15.0.tar.gz');
    expect(log.error).toHaveBeenCalledWith(
      'Failed to download or store version 8.15.1: Download failed'
    );
    expect(log.error).toHaveBeenCalledWith(
      'Failed to download or store version 8.15.0: Download failed'
    );
  });

  it('does not attempt fallback when patch version is 0', async () => {
    (getAgentDownloadUrl as jest.Mock).mockResolvedValue({ url });
    (getAgentFileName as jest.Mock).mockReturnValue('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock).mockResolvedValue(undefined);

    await agentDownloaderRunner({
      flags: { version: '8.15.0', closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledTimes(1); // Only one call for 8.15.0
    expect(getAgentFileName).toHaveBeenCalledTimes(1);
    expect(downloadAndStoreAgent).toHaveBeenCalledWith(url, fileName);
    expect(log.info).toHaveBeenCalledWith('Successfully downloaded and stored version 8.15.0');
  });

  it('logs an error for an invalid version format', async () => {
    const invalidVersion = '7.x.x';

    await expect(
      agentDownloaderRunner({
        flags: { version: invalidVersion, closestMatch },
        log,
      } as unknown as RunContext)
    ).rejects.toThrow('Invalid version format');
  });

  it('passes the closestMatch flag correctly', async () => {
    closestMatch = true;

    (getAgentDownloadUrl as jest.Mock).mockResolvedValue({ url });
    (getAgentFileName as jest.Mock).mockReturnValue('elastic-agent-8.15.0');
    (downloadAndStoreAgent as jest.Mock).mockResolvedValue(undefined);

    await agentDownloaderRunner({
      flags: { version, closestMatch },
      log,
    } as unknown as RunContext);

    expect(getAgentDownloadUrl).toHaveBeenCalledWith(version, closestMatch, log);
  });

  it('throws an error when version is not provided', async () => {
    await expect(
      agentDownloaderRunner({
        flags: { closestMatch },
        log,
      } as unknown as RunContext)
    ).rejects.toThrow('version argument is required');
  });

  it('logs the correct messages when both version and fallback version are processed', async () => {
    const primaryVersion = '8.15.1';

    (getAgentDownloadUrl as jest.Mock)
      .mockResolvedValueOnce({ url })
      .mockResolvedValueOnce({ url });

    (getAgentFileName as jest.Mock)
      .mockReturnValueOnce('elastic-agent-8.15.1')
      .mockReturnValueOnce('elastic-agent-8.15.0');

    (downloadAndStoreAgent as jest.Mock)
      .mockRejectedValueOnce(new Error('Download failed')) // Fail on primary
      .mockResolvedValueOnce(undefined); // Success on fallback

    await agentDownloaderRunner({
      flags: { version: primaryVersion, closestMatch },
      log,
    } as unknown as RunContext);

    expect(log.error).toHaveBeenCalledWith(
      'Failed to download or store version 8.15.1: Download failed'
    );
    expect(log.info).toHaveBeenCalledWith('Successfully downloaded and stored version 8.15.0');
  });
});
