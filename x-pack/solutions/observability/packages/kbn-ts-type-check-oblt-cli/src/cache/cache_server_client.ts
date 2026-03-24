/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { x as tarExtract, t as tarList } from 'tar';
import { cleanTypeCheckArtifacts } from './utils';
import {
  createDownloadProgressBar,
  createExtractionProgressBar,
  createProjectRestoreProgressBar,
  formatBytes,
} from './download_progress';

const CACHE_SERVER_URL_ENV = 'TS_TYPE_CHECK_CACHE_SERVER_URL';
/** Use 127.0.0.1 so the request hits IPv4 loopback; localhost can resolve to ::1 and fail to connect. */
const DEFAULT_CACHE_SERVER_URL = 'http://127.0.0.1:3081';

/**
 * Returns the cache server base URL to try for artifact restore, or undefined to skip.
 * Set TS_TYPE_CHECK_CACHE_SERVER_URL to empty string to disable; default is http://127.0.0.1:3081.
 */
export function getCacheServerUrl(): string | undefined {
  const env = process.env[CACHE_SERVER_URL_ENV];
  if (env === '') return undefined;
  return env ?? DEFAULT_CACHE_SERVER_URL;
}

/**
 * Returns true if the cache server is reachable (any HTTP response), false if
 * it is unavailable or no server URL is configured. Uses a 1-second timeout so
 * it can run in parallel with the GCS archive listing without adding latency.
 */
export async function isCacheServerAvailable(): Promise<boolean> {
  const baseUrl = getCacheServerUrl();
  if (!baseUrl) return false;
  try {
    await fetch(baseUrl.replace(/\/$/, ''), { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads exactly `n` bytes from a web ReadableStream reader, buffering partial
 * chunks across multiple reads. Returns null only at a clean frame boundary
 * (zero leftover bytes and the stream is done).
 */
async function readExactly(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: { leftover: Buffer },
  n: number
): Promise<Buffer | null> {
  while (state.leftover.length < n) {
    const { done, value } = await reader.read();
    if (done) {
      if (state.leftover.length === 0) return null; // clean EOF between frames
      throw new Error(
        `Unexpected end of artifact stream (need ${n} bytes, have ${state.leftover.length})`
      );
    }
    state.leftover = Buffer.concat([state.leftover, Buffer.from(value)]);
  }
  const result = Buffer.from(state.leftover.subarray(0, n));
  state.leftover = Buffer.from(state.leftover.subarray(n));
  return result;
}

/**
 * Restores project artifacts from an `application/x-artifact-stream` response.
 *
 * Protocol: the server sends each pre-baked .tar.gz blob preceded by a 4-byte
 * big-endian uint32 length header. Blobs are deduplicated server-side.
 *
 * Each blob is small enough (200 KB – 2 MB) that extracting it immediately
 * creates no meaningful TCP backpressure — the OS kernel buffers the next
 * blob while the current one is being extracted to disk.
 */
async function restoreFromArtifactStream(
  log: SomeDevLog,
  body: ReadableStream,
  totalProjects: number,
  commitSha: string
): Promise<void> {
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  const state = { leftover: Buffer.alloc(0) };

  const { increment: incBar, stop: stopBar } = createProjectRestoreProgressBar(totalProjects);
  let projectsRestored = 0;
  let totalBytes = 0;

  try {
    while (true) {
      const lenBuf = await readExactly(reader, state, 4);
      if (!lenBuf) break; // clean EOF

      const blobSize = lenBuf.readUInt32BE(0);
      const blob = await readExactly(reader, state, blobSize);
      if (!blob) throw new Error('Unexpected end of artifact stream after length header');

      totalBytes += blobSize;

      // Each blob is a complete .tar.gz for one project. tar auto-detects gzip.
      // Extracting immediately here pipelines disk writes with downloading
      // of the next blob that is already buffered in the TCP receive window.
      await pipeline(Readable.from(blob), tarExtract({ cwd: REPO_ROOT }));

      projectsRestored++;
      incBar();
    }
  } finally {
    stopBar();
  }

  log.info(
    `[Cache] Retrieved ${projectsRestored} project archive(s) for commit ${commitSha.slice(
      0,
      12
    )} (${formatBytes(totalBytes)})`
  );
}

/**
 * Tries to restore TypeScript build artifacts from the granular cache server.
 * POSTs /artifacts with { commitSha, projects? }, streams the response and extracts to REPO_ROOT.
 *
 * Selective restore (projects provided): expects application/x-artifact-stream — per-project
 * blobs with 4-byte length-prefix framing. No server-side reassembly, no client buffering.
 *
 * Full restore (no projects): expects application/gzip — single combined archive (GCS passthrough).
 *
 * @returns true if restore succeeded, false if server unavailable, 404, or extract failed.
 */
export async function tryRestoreFromCacheServer(
  log: SomeDevLog,
  commitSha: string,
  projects?: string[]
): Promise<boolean> {
  const baseUrl = getCacheServerUrl();
  if (!baseUrl) return false;

  const url = `${baseUrl.replace(/\/$/, '')}/artifacts`;
  const body = JSON.stringify(
    projects && projects.length > 0 ? { commitSha, projects } : { commitSha }
  );

  try {
    log.info(`[Cache] Trying cache server at ${baseUrl} for commit ${commitSha.slice(0, 12)}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.status === 404 || !response.ok) {
      log.info(`[Cache] Cache server returned ${response.status}, restoring from GCS instead.`);
      return false;
    }

    if (!response.body) {
      log.info('[Cache] Cache server response had no body, restoring from GCS instead.');
      return false;
    }

    // Pre-deletion: remove stale artifact directories before writing fresh ones.
    // For a full restore, wipe all type-check directories.
    // For a selective restore, only remove target/types for the specific projects
    // being replaced — other projects' incremental cache stays intact.
    if (!projects || projects.length === 0) {
      await cleanTypeCheckArtifacts(log);
    } else {
      const dirsToClean = [
        ...new Set(projects.map((p) => Path.join(REPO_ROOT, Path.dirname(p), 'target', 'types'))),
      ];
      await Promise.all(
        dirsToClean.map((dir) => Fs.promises.rm(dir, { recursive: true, force: true }))
      );
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-artifact-stream')) {
      // New protocol: per-project length-prefixed blobs.
      const projectCount = Number(response.headers.get('x-project-count')) || projects?.length || 0;
      log.info('[Cache] Extracting artifacts to disk...');
      await restoreFromArtifactStream(log, response.body, projectCount, commitSha);
    } else {
      // Legacy / full-restore protocol: single combined tar.gz.
      const contentLength = Number(response.headers.get('content-length')) || undefined;
      const { meter, stop: stopBar } = createDownloadProgressBar(contentLength);

      // Phase 1: buffer to memory so tarExtract disk I/O cannot create TCP backpressure.
      const downloadedChunks: Buffer[] = [];
      const downloadStart = Date.now();
      try {
        await pipeline(
          Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
          meter,
          new Writable({
            write(chunk: Buffer, _enc, cb) {
              downloadedChunks.push(chunk);
              cb();
            },
          })
        );
      } finally {
        stopBar();
      }
      const archiveBytes = downloadedChunks.reduce((sum, c) => sum + c.length, 0);
      log.info(
        `[Cache] Retrieved archive for commit ${commitSha.slice(0, 12)} (${formatBytes(
          archiveBytes
        )})`
      );
      log.verbose(
        `[timing] Download finished in ${((Date.now() - downloadStart) / 1000).toFixed(2)}s`
      );

      // Phase 2: count entries then extract with percentage progress bar.
      const extractBuffer = Buffer.concat(downloadedChunks);
      let totalEntries = 0;
      await pipeline(
        Readable.from(extractBuffer),
        tarList({
          onentry: () => {
            totalEntries++;
          },
        })
      );
      log.verbose(`[timing] Archive scan: ${totalEntries} entries`);

      log.info('[Cache] Extracting artifacts to disk...');
      const extractStart = Date.now();
      let entriesExtracted = 0;
      const { update: updateBar, stop: stopExtractBar } = createExtractionProgressBar(totalEntries);
      try {
        await pipeline(
          Readable.from(extractBuffer),
          tarExtract({
            cwd: REPO_ROOT,
            onentry: () => {
              updateBar(++entriesExtracted);
            },
          })
        );
      } finally {
        stopExtractBar();
      }
      log.verbose(
        `[timing] Extraction finished: ${entriesExtracted} entries in ${(
          (Date.now() - extractStart) /
          1000
        ).toFixed(2)}s`
      );
    }

    log.info(`[Cache] Restored artifacts (${commitSha.slice(0, 12)}) from cache server.`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
    const detail = cause ? `${msg} (${cause})` : msg;
    log.info(`[Cache] Cache server unavailable (${detail}), restoring from GCS instead.`);
    return false;
  }
}
