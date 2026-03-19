/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { x as tarExtract } from 'tar';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import execa from 'execa';
import { GCS_BUCKET_NAME, GCS_BUCKET_PATH, GCS_BUCKET_URI, COMMITS_PATH } from '../constants';
import { createDownloadProgressBar, formatBytes } from '../download_progress';
import { getTarCreateArgs, resolveTarEnvironment } from './utils';
import { AbstractFileSystem } from './abstract_file_system';
import type { ArchiveMetadata } from './types';
import { join } from './utils';

/**
 * Convert a `gs://bucket/path` URI to the equivalent authenticated HTTPS URL
 * supported by Google Cloud Storage for direct downloads.
 */
function gsUriToHttpsUrl(gsUri: string): string {
  return gsUri.replace(/^gs:\/\//, 'https://storage.googleapis.com/');
}

export class GcsFileSystem extends AbstractFileSystem {
  private accessToken: string | undefined;

  constructor(log: SomeDevLog, accessToken?: string) {
    super(log);
    this.accessToken = accessToken;
  }

  protected getPath(archiveId: string): string {
    return join(GCS_BUCKET_URI, archiveId);
  }

  /*
   * Archive creation (unchanged — only used on CI via gcloud service account)
   */

  protected async archive(archivePath: string, fileListPath: string): Promise<void> {
    const tarProcess = execa('tar', getTarCreateArgs('-', fileListPath), {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'inherit',
      env: resolveTarEnvironment(),
      buffer: false,
    });

    const uploadProcess = execa('gcloud', ['storage', 'cp', '-', archivePath], {
      cwd: REPO_ROOT,
      stdin: 'pipe',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    if (!tarProcess.stdout || !uploadProcess.stdin) {
      tarProcess.kill();
      uploadProcess.kill();
      throw new Error('Failed to stream TypeScript cache archive to GCS.');
    }

    tarProcess.stdout.pipe(uploadProcess.stdin);

    await Promise.all([tarProcess, uploadProcess]);
  }

  /*
   * Extract — stream HTTP response directly through tar extraction
   */

  /**
   * Streams the GCS archive directly into `tar.x()` without writing a temp
   * file. This overlaps network download and disk extraction via backpressure,
   * eliminating ~350 MB of intermediate disk I/O and reducing wall-clock time
   * from `download + extract` to roughly `max(download, extract)`.
   */
  protected async extract(archivePath: string): Promise<void> {
    const url = gsUriToHttpsUrl(archivePath);
    const start = Date.now();

    try {
      const response = await fetch(url);

      if (!response.ok || !response.body) {
        throw new Error(`GCS download failed: HTTP ${response.status}`);
      }

      const contentLength = Number(response.headers.get('content-length')) || undefined;

      const { meter, stop: stopBar } = createDownloadProgressBar(contentLength);

      try {
        await pipeline(
          Readable.fromWeb(response.body as any),
          meter,
          tarExtract({ cwd: REPO_ROOT })
        );
      } finally {
        stopBar();
      }

      const elapsed = Date.now() - start;
      const totalSize = contentLength ?? 0;

      if (totalSize) {
        // archivePath is gs://bucket/commits/{sha}/archive.tar.gz — SHA is [-2]
        const shortSha = archivePath.split('/').at(-2)?.slice(0, 12) ?? '';
        const speedLabel =
          elapsed > 0 ? ` at ${formatBytes(Math.round(totalSize / (elapsed / 1000)))}/s` : '';
        this.log.info(
          `[Cache] Retrieved archive for commit ${shortSha} (${formatBytes(
            totalSize
          )}${speedLabel})`
        );
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to restore archive from GCS: ${details}`);
    }
  }

  /*
   * hasArchive (unchanged — skipped when skipExistenceCheck is true)
   */

  protected async hasArchive(archivePath: string): Promise<boolean> {
    const url = gsUriToHttpsUrl(archivePath);
    const start = Date.now();

    try {
      const response = await fetch(url, { method: 'HEAD' });

      this.log.verbose(
        `  hasArchive: ${response.ok ? 'found' : response.status} (${Date.now() - start}ms)`
      );
      return response.ok;
    } catch (error) {
      this.log.verbose(`  hasArchive: failed (${Date.now() - start}ms)`);
      return false;
    }
  }

  /*
   * Read metadata — fetch the small JSON metadata file for a given archive
   */

  protected async readMetadata(metadataPath: string): Promise<ArchiveMetadata | undefined> {
    const url = gsUriToHttpsUrl(metadataPath);
    const start = Date.now();

    try {
      const response = await fetch(url);

      if (!response.ok) {
        this.log.verbose(`  readMetadata: ${response.status} (${Date.now() - start}ms)`);
        return undefined;
      }

      const data = (await response.json()) as ArchiveMetadata;
      this.log.verbose(`  readMetadata: success (${Date.now() - start}ms)`);
      return data;
    } catch (error) {
      this.log.verbose(`  readMetadata: failed (${Date.now() - start}ms)`);
      return undefined;
    }
  }

  /*
   * Write metadata (unchanged — only used on CI)
   */

  protected async writeMetadata(metadataPath: string, data: ArchiveMetadata): Promise<void> {
    const objectPath = metadataPath.replace(`gs://${GCS_BUCKET_NAME}/`, '');
    const uploadUrl =
      `https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET_NAME}/o` +
      `?uploadType=media&name=${encodeURIComponent(objectPath)}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload metadata: HTTP ${response.status}`);
    }
  }

  /*
   * List available commit SHAs in GCS
   */

  /**
   * Lists commit SHAs with archived artifacts in GCS using the JSON API.
   * Paginates through `storage.googleapis.com/storage/v1/b/{bucket}/o` with
   * a prefix + delimiter to enumerate "directory" prefixes.
   *
   * Returns the set of SHAs and the elapsed time in milliseconds so the caller
   * can log at the appropriate level (info when GCS will actually be used,
   * verbose when a cache server will handle the restore).
   */
  async listAvailableCommitShas(): Promise<{ shas: Set<string>; elapsedMs: number }> {
    const objectPrefix = `${GCS_BUCKET_PATH}/${COMMITS_PATH}/`;
    const baseUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET_NAME}/o`;
    const start = Date.now();

    try {
      const shas = new Set<string>();
      let pageToken: string | undefined;

      do {
        const params = new URLSearchParams({
          prefix: objectPrefix,
          delimiter: '/',
          maxResults: '1000',
          fields: 'prefixes,nextPageToken',
        });
        if (pageToken) {
          params.set('pageToken', pageToken);
        }

        const response = await fetch(`${baseUrl}?${params}`);

        if (!response.ok) {
          throw new Error(`GCS API returned ${response.status}`);
        }

        const data = (await response.json()) as {
          prefixes?: string[];
          nextPageToken?: string;
        };

        if (data.prefixes) {
          for (const p of data.prefixes) {
            const sha = p.slice(objectPrefix.length).replace(/\/$/, '');
            if (sha.length > 0) {
              shas.add(sha);
            }
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      return { shas, elapsedMs: Date.now() - start };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.log.verbose(`Failed to list GCS archives: ${details} (${Date.now() - start}ms)`);
      return { shas: new Set(), elapsedMs: Date.now() - start };
    }
  }

  async clean(): Promise<void> {
    // do nothing
  }
}
