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

    this.log.info(`Downloading agent from [${agentDownloadUrl}]`);

    await this.ensureExists();

    const newDownloadInfo = this.getPathsForUrl(agentDownloadUrl, agentFileName);
    this.log.info(`path: ${newDownloadInfo.fullFilePath}`);
    // If download is already present on disk, then just return that info. No need to re-download it
    if (fs.existsSync(newDownloadInfo.fullFilePath)) {
      this.log.debug(`Download already cached at [${newDownloadInfo.fullFilePath}]`);
      this.log.info(`Download already cached at [${newDownloadInfo.fullFilePath}]`);
      return newDownloadInfo;
    }

    let attempt = 0;
    const maxAttempts = 2;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (attempt < maxAttempts) {
      try {
        this.log.info(
          `Downloading agent from [${agentDownloadUrl}] to [${newDownloadInfo.fullFilePath}]`
        );
        const outputStream = fs.createWriteStream(newDownloadInfo.fullFilePath);

        await handleProcessInterruptions(
          async () => {
            try {
              const { body } = await nodeFetch(agentDownloadUrl);
              await finished(body.pipe(outputStream));
            } catch (error) {
              this.log.error(`Error during fetch: ${error.message}`);
              throw error;
            }
          },
          () => {
            fs.promises.unlink(newDownloadInfo.fullFilePath);
          }
        );

        this.log.info(
          `Downloaded agent from [${agentDownloadUrl}] to [${newDownloadInfo.fullFilePath}]`
        );
        await this.cleanupDownloads();
        this.log.info(`finished cleanupDownloads`);
        return newDownloadInfo;
      } catch (e) {
        this.log.error(
          `Failed to download agent from [${agentDownloadUrl}] on attempt ${attempt + 1}`
        );
        await unlink(newDownloadInfo.fullFilePath);
        attempt += 1;

        if (attempt >= maxAttempts) {
          throw e;
        }
        await delay(attempt * 1000); // Add exponential backoff
        this.log.info(`Retrying download...`);
      }
    }

    this.log.info(
      `Downloaded agent from [${agentDownloadUrl}] to [${newDownloadInfo.fullFilePath}]`
    );
    await this.cleanupDownloads();

    this.log.info(`finished cleanupDownloads`);
    return newDownloadInfo;
  }

  public async cleanupDownloads(): Promise<{ deleted: string[] }> {
    this.log.debug(`Performing cleanup of cached Agent downloads`);

    const settings = await this.get();
    const maxAgeDate = new Date();
    const response: { deleted: string[] } = { deleted: [] };

    maxAgeDate.setMilliseconds(settings.maxFileAge * -1); // Go back in time by `maxFileAge`

    // If cleanup already happened recently, exit early.
    if (settings.lastCleanup > maxAgeDate.toISOString()) {
      this.log.debug(`Skipping cleanup as lastCleanup is more recent than maxFileAge.`);
      return response;
    }

    // Update lastCleanup time
    await this.save({
      ...settings,
      lastCleanup: new Date().toISOString(),
    });

    try {
      const allFiles = await readdir(this.downloadsDirFullPath);

      // Create an array of promises for file deletion
      const deleteFilePromises = allFiles.map(async (fileName) => {
        const filePath = join(this.downloadsDirFullPath, fileName);
        const fileStats = await stat(filePath);

        // Only delete files older than the maxAgeDate
        if (fileStats.isFile() && fileStats.birthtime < maxAgeDate) {
          try {
            await unlink(filePath); // Async version of deleting the file
            response.deleted.push(filePath); // Track successfully deleted files
          } catch (err) {
            this.log.error(`Failed to delete file: ${filePath}. Error: ${err.message}`);
          }
        }
      });

      // Wait for all delete operations to finish
      await Promise.allSettled(deleteFilePromises);

      this.log.debug(`Deleted [${response.deleted.length}] file(s)`);
      this.log.verbose(`Files deleted:\n${response.deleted.join('\n')}`);
    } catch (err) {
      this.log.error(`Error during cleanup: ${err.message}`);
    }

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
