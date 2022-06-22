/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import tar from 'tar';
import yauzl from 'yauzl';

import { bufferToStream, streamToBuffer } from '../streams';

import type { ArchiveEntry } from '.';

export async function untarBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = (entry: ArchiveEntry): void => {}
): Promise<unknown> {
  const deflatedStream = bufferToStream(buffer);
  // use tar.list vs .extract to avoid writing to disk
  const inflateStream = tar.list().on('entry', (entry: tar.FileStat) => {
    const path = entry.header.path || '';
    if (!filter({ path })) return;
    streamToBuffer(entry).then((entryBuffer) => onEntry({ buffer: entryBuffer, path }));
  });

  return new Promise((resolve, reject) => {
    inflateStream.on('end', resolve).on('error', reject);
    deflatedStream.pipe(inflateStream);
  });
}

export async function unzipBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = (entry: ArchiveEntry): void => {}
): Promise<unknown> {
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

type BufferExtractor = typeof unzipBuffer | typeof untarBuffer;
export function getBufferExtractor(
  args: { contentType: string } | { archivePath: string }
): BufferExtractor | undefined {
  if ('contentType' in args) {
    if (args.contentType === 'application/gzip') {
      return untarBuffer;
    } else if (args.contentType === 'application/zip') {
      return unzipBuffer;
    }
  } else if ('archivePath' in args) {
    if (args.archivePath.endsWith('.zip')) {
      return unzipBuffer;
    }
    if (args.archivePath.endsWith('.gz')) {
      return untarBuffer;
    }
  }
}

function yauzlFromBuffer(buffer: Buffer, opts: yauzl.Options): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, opts, (err?: Error, handle?: yauzl.ZipFile) =>
      err ? reject(err) : resolve(handle!)
    )
  );
}

function getZipReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) =>
    zipfile.openReadStream(entry, (err?: Error, readStream?: NodeJS.ReadableStream) =>
      err ? reject(err) : resolve(readStream!)
    )
  );
}
