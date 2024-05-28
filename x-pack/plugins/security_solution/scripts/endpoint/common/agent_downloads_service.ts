/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import nodeFetch from 'node-fetch';
import { finished } from 'stream/promises';
import { handleProcessInterruptions } from './nodejs_utils';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { SettingsStorage } from './settings_storage';

export interface DownloadedAgentInfo {
  filename: string;
  /** The local directory where downloads are stored */
  directory: string;
  /** The full local file path and name */
  fullFilePath: string;
}

interface AgentDownloadStorageSettings {
  /**
   * Last time a cleanup was ran. Date in ISO format
   */
  lastCleanup: string;

  /**
   * The max file age in milliseconds. Defaults to 2 days
   */
  maxFileAge: number;
}

/**
 * Class for managing Agent Downloads on the local disk
 * @private
 */
class AgentDownloadStorage extends SettingsStorage<AgentDownloadStorageSettings> {
  private downloadsFolderExists = false;
  private readonly downloadsDirName = 'agent_download_storage';
  private readonly downloadsDirFullPath: string;
  private readonly log = createToolingLogger();

  constructor() {
    super('agent_download_storage_settings.json', {
      defaultSettings: {
        maxFileAge: 1.728e8, // 2 days
        lastCleanup: new Date().toISOString(),
      },
    });

    this.downloadsDirFullPath = this.buildPath(this.downloadsDirName);
  }

  protected async ensureExists(): Promise<void> {
    await super.ensureExists();

    if (!this.downloadsFolderExists) {
      await mkdir(this.downloadsDirFullPath, { recursive: true });
      this.log.debug(`Created directory [this.downloadsDirFullPath] for cached agent downloads`);
      this.downloadsFolderExists = true;
    }
  }

  public getPathsForUrl(agentDownloadUrl: string, agentFileName?: string): DownloadedAgentInfo {
    const filename = agentFileName
      ? agentFileName
      : agentDownloadUrl.replace(/^https?:\/\//gi, '').replace(/\//g, '#');
    const directory = this.downloadsDirFullPath;
    const fullFilePath = this.buildPath(join(this.downloadsDirName, filename));

    return {
      filename,
      directory,
      fullFilePath,
    };
  }

  public async downloadAndStore(
    agentDownloadUrl: string,
    agentFileName?: string
  ): Promise<DownloadedAgentInfo> {
    this.log.debug(`Downloading and storing: ${agentDownloadUrl}`);

    // TODO: should we add "retry" attempts to file downloads?

    await this.ensureExists();

    const newDownloadInfo = this.getPathsForUrl(agentDownloadUrl, agentFileName);

    // If download is already present on disk, then just return that info. No need to re-download it
    if (fs.existsSync(newDownloadInfo.fullFilePath)) {
      this.log.debug(`Download already cached at [${newDownloadInfo.fullFilePath}]`);
      return newDownloadInfo;
    }

    try {
      const outputStream = fs.createWriteStream(newDownloadInfo.fullFilePath);

      await handleProcessInterruptions(
        async () => {
          const { body } = await nodeFetch(agentDownloadUrl);
          await finished(body.pipe(outputStream));
        },
        () => {
          fs.unlinkSync(newDownloadInfo.fullFilePath);
        }
      );
    } catch (e) {
      // Try to clean up download case it failed halfway through
      await unlink(newDownloadInfo.fullFilePath);

      throw e;
    }

    await this.cleanupDownloads();

    return newDownloadInfo;
  }

  public async cleanupDownloads(): Promise<{ deleted: string[] }> {
    this.log.debug(`Performing cleanup of cached Agent downlaods`);

    const settings = await this.get();
    const maxAgeDate = new Date();
    const response: { deleted: string[] } = { deleted: [] };

    maxAgeDate.setMilliseconds(settings.maxFileAge * -1); // `* -1` to set time back

    // If cleanup already happen within the file age, then nothing to do. Exit.
    if (settings.lastCleanup > maxAgeDate.toISOString()) {
      return response;
    }

    await this.save({
      ...settings,
      lastCleanup: new Date().toISOString(),
    });

    const deleteFilePromises: Array<Promise<unknown>> = [];
    const allFiles = await readdir(this.downloadsDirFullPath);

    for (const fileName of allFiles) {
      const filePath = join(this.downloadsDirFullPath, fileName);
      const fileStats = await stat(filePath);

      if (fileStats.isFile() && fileStats.birthtime < maxAgeDate) {
        deleteFilePromises.push(unlink(filePath));
        response.deleted.push(filePath);
      }
    }

    await Promise.allSettled(deleteFilePromises);

    this.log.debug(`Deleted [${response.deleted.length}] file(s)`);
    this.log.verbose(`files deleted:\n`, response.deleted.join('\n'));

    return response;
  }

  public isAgentDownloadFromDiskAvailable(filename: string): DownloadedAgentInfo | undefined {
    if (fs.existsSync(join(this.downloadsDirFullPath, filename))) {
      return {
        filename,
        /** The local directory where downloads are stored */
        directory: this.downloadsDirFullPath,
        /** The full local file path and name */
        fullFilePath: join(this.downloadsDirFullPath, filename),
      };
    }
  }
}

const agentDownloadsClient = new AgentDownloadStorage();

export interface DownloadAndStoreAgentResponse extends DownloadedAgentInfo {
  url: string;
}

/**
 * Downloads the agent file provided via the input URL to a local folder on disk. If the file
 * already exists on disk, then no download is actually done - the information about the cached
 * version is returned instead
 * @param agentDownloadUrl
 * @param agentFileName
 */
export const downloadAndStoreAgent = async (
  agentDownloadUrl: string,
  agentFileName?: string
): Promise<DownloadAndStoreAgentResponse> => {
  const downloadedAgent = await agentDownloadsClient.downloadAndStore(
    agentDownloadUrl,
    agentFileName
  );

  return {
    url: agentDownloadUrl,
    ...downloadedAgent,
  };
};

/**
 * Cleans up the old agent downloads on disk.
 */
export const cleanupDownloads = async (): ReturnType<AgentDownloadStorage['cleanupDownloads']> => {
  return agentDownloadsClient.cleanupDownloads();
};

export const isAgentDownloadFromDiskAvailable = (
  fileName: string
): DownloadedAgentInfo | undefined => {
  return agentDownloadsClient.isAgentDownloadFromDiskAvailable(fileName);
};
