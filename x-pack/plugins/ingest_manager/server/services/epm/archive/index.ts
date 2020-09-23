/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';

import { ArchivePackage } from '../../../../common/types';
import { PackageInvalidArchiveError, PackageUnsupportedMediaTypeError } from '../../../errors';
import { cacheGet, cacheSet, setArchiveFilelist } from '../registry/cache';
import { unzipBuffer, untarBuffer, ArchiveEntry } from '../registry/extract';

export async function loadArchive({
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
      `Error during extraction of uploaded package: ${error}. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }

  // While unpacking a tar.gz file with unzipBuffer() will result in a thrown error in the try-catch above,
  // unpacking a zip file with untarBuffer() just results in nothing.
  if (paths.length === 0) {
    throw new PackageInvalidArchiveError(
      `Uploaded archive seems empty. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
  return paths;
}

function parseAndVerifyArchive(paths: string[]): ArchivePackage {
  // The top-level directory must match pkgName-pkgVersion, and no other top-level files or directories may be present
  const toplevelDir = paths[0].split('/')[0];
  paths.forEach((path) => {
    if (path.split('/')[0] !== toplevelDir) {
      throw new PackageInvalidArchiveError('Package contains more than one top-level directory.');
    }
  });

  // The package must contain a manifest file ...
  const manifestFile = `${toplevelDir}/manifest.yml`;
  const manifestBuffer = cacheGet(manifestFile);
  if (!paths.includes(manifestFile) || !manifestBuffer) {
    throw new PackageInvalidArchiveError('Package must contain a top-level manifest.yml file.');
  }

  // ... which must be valid YAML
  let manifest;
  try {
    manifest = yaml.load(manifestBuffer.toString());
  } catch (error) {
    throw new PackageInvalidArchiveError(`Could not parse top-level package manifest: ${error}.`);
  }

  // Package name and version from the manifest must match those from the toplevel directory
  if (toplevelDir !== `${manifest.name}-${manifest.version}`) {
    throw new PackageInvalidArchiveError(
      `Name ${manifest.name} and version ${manifest.version} do not match top-level directory ${toplevelDir}`
    );
  }
  // Allow snake case for format_version
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { name, version, description, type, categories, format_version } = manifest;
  return {
    name,
    version,
    description,
    type,
    categories,
    format_version,
  };
}
