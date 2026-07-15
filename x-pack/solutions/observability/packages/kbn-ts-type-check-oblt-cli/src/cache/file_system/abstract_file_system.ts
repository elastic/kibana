/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { ArchiveMetadata } from './types';
import { COMMITS_PATH, PULL_REQUESTS_PATH, TMP_DIR } from '../constants';
import { doHashesMatch, join } from './utils';
import { cleanTypeCheckArtifacts, calculateFileHashes } from '../utils';

export abstract class AbstractFileSystem {
  constructor(protected readonly log: SomeDevLog) {}

  protected abstract getPath(archiveId: string): string;

  protected abstract readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined>;

  protected abstract writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void>;

  protected abstract hasArchive(archivePath: string): Promise<boolean>;

  protected abstract extract(archivePath: string): Promise<void>;

  protected abstract archive(archivePath: string, fileListPath: string): Promise<void>;

  public abstract clean(): Promise<void>;

  protected getArchivePath(archiveId: string) {
    return join(this.getPath(archiveId), `archive.tar.gz`);
  }

  protected getMetadataPath(archiveId: string) {
    return join(this.getPath(archiveId), `metadata.json`);
  }

  private async writeFileList(files: string[]): Promise<string> {
    // Build a null-delimited file list so tar avoids path escaping and can scan names quickly.
    // Example: find . -print0 | tar --null -T - --create …
    const fileListPath = Path.join(TMP_DIR, 'ts-artifacts.list');
    const nullDelimiter = '\0';

    const fileListContent = Buffer.from(`${files.join(nullDelimiter)}${nullDelimiter}`, 'utf8');

    await Fs.promises.mkdir(TMP_DIR, { recursive: true });

    await Fs.promises.writeFile(fileListPath, fileListContent);

    return fileListPath;
  }

  /**
   * Returns the first SHA in `shas` that has an archive in this file system,
   * without extracting anything. Use this to determine artifact state cheaply
   * (e.g. when artifacts already exist on disk and a full restore can be skipped).
   */
  /**
   * Reads prs/<prNumber>/metadata.json and returns the PR branch tip SHA that
   * was type-checked and archived, or undefined if no archive exists for that PR.
   */
  public async getPrArchiveTipSha(prNumber: string): Promise<string | undefined> {
    const metadata = await this.readMetadata(
      this.getMetadataPath(join(PULL_REQUESTS_PATH, prNumber))
    );
    return metadata?.commitSha;
  }

  /**
   * Reads prs/<prNumber>/metadata.json and returns the file hashes recorded at
   * build time (yarn.lock, .nvmrc, .node-version). Used to verify that the PR
   * archive was built against the same node_modules as the current checkout.
   */
  public async getPrArchiveFileHashes(
    prNumber: string
  ): Promise<Record<string, string> | undefined> {
    const metadata = await this.readMetadata(
      this.getMetadataPath(join(PULL_REQUESTS_PATH, prNumber))
    );
    return metadata?.fileHashes as Record<string, string> | undefined;
  }

  public async findBestSha(shas: string[]): Promise<string | undefined> {
    for (const sha of shas) {
      const archivePath = this.getArchivePath(join(COMMITS_PATH, sha));
      if (await this.hasArchive(archivePath)) {
        return sha;
      }
    }
    return undefined;
  }

  public async restoreArchive(options: {
    shas: string[];
    prNumber?: string;
    cacheInvalidationFiles?: string[];
    /** When true, skip the per-SHA hasArchive() check. Use when the caller
     *  has already verified that the provided SHAs have archives (e.g. via
     *  listAvailableCommitShas). */
    skipExistenceCheck?: boolean;
    /** When true, skip cleaning existing type cache directories and config
     *  files before extraction. Useful for local dev where the caller has
     *  already verified no artifacts exist and configs were just generated. */
    skipClean?: boolean;
  }): Promise<string | undefined> {
    const prArchiveId = options.prNumber ? join(PULL_REQUESTS_PATH, options.prNumber) : undefined;

    const prArchiveMetadata = prArchiveId
      ? await this.readMetadata(this.getMetadataPath(prArchiveId))
      : undefined;

    const prSha = prArchiveMetadata?.commitSha;

    // Calculate current file hashes if cache invalidation files are provided
    const currentFileHashes =
      options.cacheInvalidationFiles && options.cacheInvalidationFiles.length > 0
        ? await calculateFileHashes(options.cacheInvalidationFiles)
        : undefined;

    const totalShas = options.shas.length;

    // Only log the search banner when we're genuinely scanning multiple candidates.
    // When skipExistenceCheck is set the SHA is already resolved by the caller.
    if (!options.skipExistenceCheck) {
      this.log.info(`[Cache] Searching ${totalShas} candidate commit(s) for cached artifacts...`);
    }

    for (let i = 0; i < totalShas; i++) {
      const sha = options.shas[i];
      const shortSha = sha.slice(0, 12);
      const archiveId = prSha && sha === prSha ? prArchiveId! : join(COMMITS_PATH, sha);

      const archivePath = this.getArchivePath(archiveId);

      this.log.verbose(`[${i + 1}/${totalShas}] Checking ${shortSha}...`);

      const archiveExists = options.skipExistenceCheck || (await this.hasArchive(archivePath));

      if (archiveExists) {
        if (currentFileHashes) {
          const metadata = await this.readMetadata(this.getMetadataPath(archiveId));
          const hashCheckResult = doHashesMatch({
            currentFileHashes,
            storedFileHashes: metadata?.fileHashes,
          });

          if (!hashCheckResult.result) {
            this.log.warning(
              `Cached TypeScript build artifacts for ${shortSha} found, but cache invalidation files have changed:\n ${hashCheckResult.message}`
            );
            return undefined;
          }
        }

        if (!options.skipClean) {
          await cleanTypeCheckArtifacts(this.log);
        }

        if (options.skipExistenceCheck) {
          this.log.info(`[Cache] Restoring ${shortSha}...`);
        } else {
          this.log.info(`[Cache] Found archive for ${shortSha}, extracting...`);
        }

        await this.extract(archivePath);

        return sha;
      }

      this.log.verbose(`[${i + 1}/${totalShas}] No archive for ${shortSha}`);
    }

    this.log.info(`[Cache] No cached artifacts found after checking ${totalShas} commit(s).`);

    return undefined;
  }

  public async updateArchive(options: {
    files: string[];
    sha: string;
    prNumber?: string;
    cacheInvalidationFiles?: string[];
  }) {
    const archiveId = options.prNumber
      ? join(PULL_REQUESTS_PATH, options.prNumber.toString())
      : join(COMMITS_PATH, options.sha);

    // Calculate file hashes if cache invalidation files are provided
    const fileHashes =
      options.cacheInvalidationFiles && options.cacheInvalidationFiles.length > 0
        ? await calculateFileHashes(options.cacheInvalidationFiles)
        : undefined;

    // Convert null values to undefined for JSON serialization
    const fileHashesForMetadata: Record<string, string> | undefined = fileHashes
      ? Object.fromEntries(
          Object.entries(fileHashes).filter((entry): entry is [string, string] => entry[1] !== null)
        )
      : undefined;

    const metadata: ArchiveMetadata = {
      commitSha: options.sha,
      prNumber: options.prNumber,
      fileHashes: fileHashesForMetadata,
    };

    const fileListPath = await this.writeFileList(options.files);

    const archivePath = this.getArchivePath(archiveId);

    this.log.info(`Writing archive to ${archivePath}`);

    await this.archive(archivePath, fileListPath);

    await this.writeMetadata(this.getMetadataPath(archiveId), metadata);
  }
}
