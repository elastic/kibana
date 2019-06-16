/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import tar from 'tar';
import yauzl from 'yauzl';
import { cacheGet, cacheSet, cacheHas } from './cache';
import { fetchJson, getResponseStream } from './requests';
import { bufferToStream, streamToBuffer } from './streams';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';

export async function fetchList() {
  return fetchJson(`${REGISTRY}/list`);
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

export async function getArchiveInfo(
  key: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const archiveBuffer = await getOrFetchArchiveBuffer(key);
  const extract = key.endsWith('.zip') ? unzipBuffer : untarBuffer;

  const paths: string[] = [];
  const onEntry = (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    paths.push(path);
    if (cacheHas(path)) return;
    if (buffer) cacheSet(path, buffer);
  };

  await extract(archiveBuffer, filter, onEntry);

  return paths;
}

async function getOrFetchArchiveBuffer(key: string): Promise<Buffer> {
  if (!cacheHas(key)) {
    await getResponseStream(`${REGISTRY}/package/${key}`)
      .then(streamToBuffer)
      .then(buffer => cacheSet(key, buffer));
  }

  const buffer = cacheGet(key);
  if (!buffer) throw new Error(`no archive buffer for ${key}`);

  return buffer;
}

async function unzipBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = (entry: ArchiveEntry) => {}
): Promise<string[]> {
  const zipfile = await yauzlFromBuffer(buffer, { lazyEntries: true });
  zipfile.readEntry();
  zipfile.on('entry', async (entry: yauzl.Entry) => {
    const path = entry.fileName;
    if (!filter({ path })) return zipfile.readEntry();

    const entryBuffer = await getZipReadStream(zipfile, entry).then(streamToBuffer);
    onEntry({ buffer: entryBuffer, path });
    zipfile.readEntry();
  });
  return new Promise((resolve, reject) => zipfile.on('end', resolve).on('error', reject));
}

async function untarBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = (entry: ArchiveEntry) => {}
): Promise<string[]> {
  const deflatedStream = bufferToStream(buffer);
  // use tar.list vs .extract to avoid writing to disk
  const inflateStream = tar.list().on('entry', (entry: tar.FileStat) => {
    const path = entry.header.path || '';
    if (!filter({ path })) return;
    streamToBuffer(entry).then(entryBuffer => onEntry({ buffer: entryBuffer, path }));
  });

  return new Promise((resolve, reject) => {
    inflateStream.on('end', resolve).on('error', reject);
    deflatedStream.pipe(inflateStream);
  });
}

function yauzlFromBuffer(buffer: Buffer, opts: yauzl.Options): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, opts, (err?, handle?) => (err ? reject(err) : resolve(handle)))
  );
}

function getZipReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) =>
    zipfile.openReadStream(entry, (err?: Error, readStream?: NodeJS.ReadableStream) =>
      err ? reject(err) : resolve(readStream)
    )
  );
}

interface ArchiveEntry {
  path: string;
  buffer?: Buffer;
}
