/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArchivePackage } from '../../../../common/types';
import { PackageInvalidArchiveError, PackageUnsupportedMediaTypeError } from '../../../errors';
import { cacheSet } from '../registry/cache';
import { unzipBuffer, untarBuffer, ArchiveEntry } from '../registry/extract';

export async function loadArchive({
  archiveBuffer,
  contentType,
}: {
  archiveBuffer: Buffer;
  contentType: string;
}): Promise<{ paths: string[]; archivePackageInfo: ArchivePackage }> {
  const paths = await unpackArchiveToCache(archiveBuffer, contentType);

  return {
    paths,
    archivePackageInfo: {
      name: 'foo',
      version: '0.0.1',
      description: 'description',
      type: 'type',
      categories: ['foo'],
      format_version: 'format_version',
    },
  };
}

function getBufferExtractorForContentType(contentType: string) {
  if (contentType === 'application/gzip') {
    return untarBuffer;
  } else if (contentType === 'application/zip') {
    return unzipBuffer;
  } else {
    throw new PackageUnsupportedMediaTypeError(
      `Unsupported media type ${contentType}. Please use 'application/gzip' or 'application/zip'`
    );
  }
}

export async function unpackArchiveToCache(
  archiveBuffer: Buffer,
  contentType: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const bufferExtractor = getBufferExtractorForContentType(contentType);
  const paths: string[] = [];
  try {
    await bufferExtractor(archiveBuffer, filter, (entry: ArchiveEntry) => {
      const { path, buffer } = entry;
      // skip directories
      if (path.slice(-1) === '/') return;
      if (buffer) {
        cacheSet(path, buffer);
        paths.push(path);
      }
    });
  } catch (error) {
    throw new PackageInvalidArchiveError(
      `Error during extraction of uploaded package: ${error}. Assumed content type was ${contentType}.`
    );
  }

  return paths;
}
