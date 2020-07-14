/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import tar from 'tar';
import { bufferToStream, streamToBuffer } from './streams';

export interface ArchiveEntry {
  path: string;
  buffer?: Buffer;
}

export async function untarBuffer(
  buffer: Buffer,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry = (entry: ArchiveEntry): void => {}
): Promise<void> {
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
