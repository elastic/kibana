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
import { ArchiveEntry, getBufferExtractor } from '../registry/extract';
import { parseAndVerifyArchive } from './validation';

export * from './cache';

export async function loadArchivePackage({
  archiveBuffer,
  contentType,
}: {
  archiveBuffer: Buffer;
  contentType: string;
}): Promise<{ paths: string[]; archivePackageInfo: ArchivePackage }> {
  const paths = await unpackArchiveToCache(archiveBuffer, contentType);
  const archivePackageInfo = parseAndVerifyArchive(paths);
  setArchiveFilelist(archivePackageInfo.name, archivePackageInfo.version, paths);

  return {
    paths,
    archivePackageInfo,
  };
}

export async function unpackArchiveToCache(
  archiveBuffer: Buffer,
  contentType: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const bufferExtractor = getBufferExtractor({ contentType });
  if (!bufferExtractor) {
    throw new PackageUnsupportedMediaTypeError(
      `Unsupported media type ${contentType}. Please use 'application/gzip' or 'application/zip'`
    );
  }
  const paths: string[] = [];
  try {
    await bufferExtractor(archiveBuffer, filter, (entry: ArchiveEntry) => {
      const { path, buffer } = entry;
      // skip directories
      if (path.endsWith('/')) return;
      if (buffer) {
        cacheSet(path, buffer);
        paths.push(path);
      }
    });
  } catch (error) {
    throw new PackageInvalidArchiveError(
      `Error during extraction of package: ${error}. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }

  // While unpacking a tar.gz file with unzipBuffer() will result in a thrown error in the try-catch above,
  // unpacking a zip file with untarBuffer() just results in nothing.
  if (paths.length === 0) {
    throw new PackageInvalidArchiveError(
      `Archive seems empty. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
  return paths;
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
