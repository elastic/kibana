/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetParts, InstallSource } from '../../../../common/types';
import { PackageInvalidArchiveError, PackageUnsupportedMediaTypeError } from '../../../errors';

import {
  getArchiveEntry,
  setArchiveEntry,
  deleteArchiveEntry,
  getArchiveFilelist,
  setArchiveFilelist,
  deleteArchiveFilelist,
  deletePackageInfo,
  clearPackageFileCache,
} from './cache';
import type { SharedKey } from './cache';
import { getBufferExtractor } from './extract';

export * from './cache';
export { getBufferExtractor, untarBuffer, unzipBuffer } from './extract';
export { generatePackageInfoFromArchiveBuffer } from './parse';

export interface ArchiveEntry {
  path: string;
  buffer?: Buffer;
}

export async function unpackBufferToCache({
  name,
  version,
  contentType,
  archiveBuffer,
  installSource,
}: {
  name: string;
  version: string;
  contentType: string;
  archiveBuffer: Buffer;
  installSource: InstallSource;
}): Promise<string[]> {
  // Make sure any buffers from previous installations from registry or upload are deleted first
  clearPackageFileCache({ name, version });

  const entries = await unpackBufferEntries(archiveBuffer, contentType);
  const paths: string[] = [];
  entries.forEach((entry) => {
    const { path, buffer } = entry;
    if (buffer) {
      setArchiveEntry(path, buffer);
      paths.push(path);
    }
  });
  setArchiveFilelist({ name, version }, paths);

  return paths;
}

export async function unpackBufferEntries(
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

export const deletePackageCache = ({ name, version }: SharedKey) => {
  // get cached archive filelist
  const paths = getArchiveFilelist({ name, version });

  // delete cached archive filelist
  deleteArchiveFilelist({ name, version });

  // delete cached archive files
  // this has been populated in unpackBufferToCache()
  paths?.forEach(deleteArchiveEntry);

  deletePackageInfo({ name, version });
};

export function getPathParts(path: string): AssetParts {
  let dataset;

  let [pkgkey, service, type, file] = path.split('/');

  // if it's a data stream
  if (service === 'data_stream') {
    // save the dataset name
    dataset = type;
    // drop the `data_stream/dataset-name` portion & re-parse
    [pkgkey, service, type, file] = path.replace(`data_stream/${dataset}/`, '').split('/');
  }

  // To support the NOTICE asset at the root level
  if (service === 'NOTICE.txt') {
    file = service;
    type = 'notice';
    service = '';
  }

  // This is to cover for the fields.yml files inside the "fields" directory
  if (file === undefined) {
    file = type;
    type = 'fields';
    service = '';
  }

  return {
    pkgkey,
    service,
    type,
    file,
    dataset,
    path,
  } as AssetParts;
}

export function getAsset(key: string) {
  const buffer = getArchiveEntry(key);
  if (buffer === undefined) throw new Error(`Cannot find asset ${key}`);

  return buffer;
}
