/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArchivePackage } from '../../../../common/types';
import { PackageInvalidArchiveError, PackageUnsupportedMediaTypeError } from '../../../errors';
import {
  cacheSet,
  cacheDelete,
  getArchiveFilelist,
  setArchiveFilelist,
  deleteArchiveFilelist,
} from './cache';
import { getBufferExtractor } from './extract';
import { parseAndVerifyArchiveEntries } from './validation';

export * from './cache';
export { untarBuffer, unzipBuffer, getBufferExtractor } from './extract';

export interface ArchiveEntry {
  path: string;
  buffer?: Buffer;
}

export async function getArchivePackage({
  archiveBuffer,
  contentType,
}: {
  archiveBuffer: Buffer;
  contentType: string;
}): Promise<{ paths: string[]; archivePackageInfo: ArchivePackage }> {
  const entries = await unpackArchiveEntries(archiveBuffer, contentType);
  const { archivePackageInfo } = await parseAndVerifyArchiveEntries(entries);
  const paths = addEntriesToMemoryStore(entries);

  setArchiveFilelist(archivePackageInfo.name, archivePackageInfo.version, paths);

  return {
    paths,
    archivePackageInfo,
  };
}

export async function unpackArchiveToCache(
  archiveBuffer: Buffer,
  contentType: string
): Promise<string[]> {
  const entries = await unpackArchiveEntries(archiveBuffer, contentType);
  return addEntriesToMemoryStore(entries);
}

function addEntriesToMemoryStore(entries: ArchiveEntry[]) {
  const paths: string[] = [];
  entries.forEach((entry) => {
    const { path, buffer } = entry;
    if (buffer) {
      cacheSet(path, buffer);
      paths.push(path);
    }
  });

  return paths;
}

export async function unpackArchiveEntries(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveEntry[]> {
  const bufferExtractor = getBufferExtractor({ contentType });
  if (!bufferExtractor) {
    throw new PackageUnsupportedMediaTypeError(
      `Unsupported media type ${contentType}. Please use 'application/gzip' or 'application/zip'`
    );
  }
  const entries: ArchiveEntry[] = [];
  try {
    const onlyFiles = ({ path }: ArchiveEntry): boolean => !path.endsWith('/');
    const addToEntries = (entry: ArchiveEntry) => entries.push(entry);
    await bufferExtractor(archiveBuffer, onlyFiles, addToEntries);
  } catch (error) {
    throw new PackageInvalidArchiveError(
      `Error during extraction of package: ${error}. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }

  // While unpacking a tar.gz file with unzipBuffer() will result in a thrown error in the try-catch above,
  // unpacking a zip file with untarBuffer() just results in nothing.
  if (entries.length === 0) {
    throw new PackageInvalidArchiveError(
      `Archive seems empty. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
  return entries;
}

export const deletePackageCache = (name: string, version: string) => {
  // get cached archive filelist
  const paths = getArchiveFilelist(name, version);

  // delete cached archive filelist
  deleteArchiveFilelist(name, version);

  // delete cached archive files
  // this has been populated in unpackArchiveToCache()
  paths?.forEach((path) => cacheDelete(path));
};
