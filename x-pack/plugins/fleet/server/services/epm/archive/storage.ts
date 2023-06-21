/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extname } from 'path';

import { isBinaryFile } from 'isbinaryfile';
import mime from 'mime-types';
import { v5 as uuidv5 } from 'uuid';
import type { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { ASSETS_SAVED_OBJECT_TYPE } from '../../../../common';
import type {
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
} from '../../../../common/types';

import { appContextService } from '../../app_context';

import { getArchiveEntry, setArchiveEntry, setArchiveFilelist, setPackageInfo } from '.';
import type { ArchiveEntry } from '.';
import { MANIFEST_NAME, parseAndVerifyArchive } from './parse';

const ONE_BYTE = 1024 * 1024;
// could be anything, picked this from https://github.com/elastic/elastic-agent-client/issues/17
const MAX_ES_ASSET_BYTES = 4 * ONE_BYTE;
// Updated to accomodate larger package size in some ML model packages
const ML_MAX_ES_ASSET_BYTES = 50 * ONE_BYTE;

export interface PackageAsset {
  package_name: string;
  package_version: string;
  install_source: string;
  asset_path: string;
  media_type: string;
  data_utf8: string;
  data_base64: string;
}

export function assetPathToObjectId(assetPath: string): string {
  // uuid v5 requires a SHA-1 UUID as a namespace
  // used to ensure same input produces the same id
  return uuidv5(assetPath, '71403015-cdd5-404b-a5da-6c43f35cad84');
}

export async function archiveEntryToESDocument(opts: {
  path: string;
  buffer: Buffer;
  name: string;
  version: string;
  installSource: InstallSource;
}): Promise<PackageAsset> {
  const { path, buffer, name, version, installSource } = opts;
  const fileExt = extname(path);
  const contentType = mime.lookup(fileExt);
  const mediaType = mime.contentType(contentType || fileExt);
  // can use to create a data URL like `data:${mediaType};base64,${base64Data}`

  const bufferIsBinary = await isBinaryFile(buffer);
  const dataUtf8 = bufferIsBinary ? '' : buffer.toString('utf8');
  const dataBase64 = bufferIsBinary ? buffer.toString('base64') : '';
  const currentMaxAssetBytes = path.includes('ml_model')
    ? ML_MAX_ES_ASSET_BYTES
    : MAX_ES_ASSET_BYTES;

  // validation: filesize? asset type? anything else
  if (dataUtf8.length > currentMaxAssetBytes) {
    throw new Error(
      `File at ${path} is larger than maximum allowed size of ${currentMaxAssetBytes}`
    );
  }

  if (dataBase64.length > currentMaxAssetBytes) {
    throw new Error(
      `After base64 encoding file at ${path} is larger than maximum allowed size of ${currentMaxAssetBytes}`
    );
  }

  return {
    package_name: name,
    package_version: version,
    install_source: installSource,
    asset_path: path,
    media_type: mediaType || '',
    data_utf8: dataUtf8,
    data_base64: dataBase64,
  };
}

export async function removeArchiveEntries(opts: {
  savedObjectsClient: SavedObjectsClientContract;
  refs?: PackageAssetReference[];
}) {
  const { savedObjectsClient, refs } = opts;
  if (!refs) return;
  return savedObjectsClient.bulkDelete(
    refs.map((ref) => ({ id: ref.id, type: ASSETS_SAVED_OBJECT_TYPE }))
  );
}

export async function saveArchiveEntries(opts: {
  savedObjectsClient: SavedObjectsClientContract;
  paths: string[];
  packageInfo: InstallablePackage;
  installSource: InstallSource;
}) {
  const { savedObjectsClient, paths, packageInfo, installSource } = opts;
  const bulkBody = await Promise.all(
    paths.map((path) => {
      const buffer = getArchiveEntry(path);
      if (!buffer) throw new Error(`Could not find ArchiveEntry at ${path}`);
      const { name, version } = packageInfo;
      return archiveEntryToBulkCreateObject({ path, buffer, name, version, installSource });
    })
  );

  const results = await savedObjectsClient.bulkCreate<PackageAsset>(bulkBody, { refresh: false });
  return results;
}

export async function archiveEntryToBulkCreateObject(opts: {
  path: string;
  buffer: Buffer;
  name: string;
  version: string;
  installSource: InstallSource;
}): Promise<SavedObjectsBulkCreateObject<PackageAsset>> {
  const { path, buffer, name, version, installSource } = opts;
  const doc = await archiveEntryToESDocument({ path, buffer, name, version, installSource });
  return {
    id: assetPathToObjectId(doc.asset_path),
    type: ASSETS_SAVED_OBJECT_TYPE,
    attributes: doc,
  };
}
export function packageAssetToArchiveEntry(asset: PackageAsset): ArchiveEntry {
  const { asset_path: path, data_utf8: utf8, data_base64: base64 } = asset;
  const buffer = utf8 ? Buffer.from(utf8, 'utf8') : Buffer.from(base64, 'base64');

  return {
    path,
    buffer,
  };
}

export async function getAsset(opts: {
  savedObjectsClient: SavedObjectsClientContract;
  path: string;
}) {
  const { savedObjectsClient, path } = opts;
  try {
    const assetSavedObject = await savedObjectsClient.get<PackageAsset>(
      ASSETS_SAVED_OBJECT_TYPE,
      assetPathToObjectId(path)
    );
    const storedAsset = assetSavedObject?.attributes;
    if (!storedAsset) {
      return;
    }

    return storedAsset;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      appContextService.getLogger().warn(error.message);
      return;
    }
    throw error;
  }
}

export const getEsPackage = async (
  pkgName: string,
  pkgVersion: string,
  references: PackageAssetReference[],
  savedObjectsClient: SavedObjectsClientContract
) => {
  const logger = appContextService.getLogger();
  const bulkRes = await savedObjectsClient.bulkGet<PackageAsset>(
    references.map((reference) => ({
      ...reference,
      fields: ['asset_path', 'data_utf8', 'data_base64'],
    }))
  );
  const errors = bulkRes.saved_objects.filter((so) => so.error || !so.attributes);
  const assets = bulkRes.saved_objects.map((so) => so.attributes);

  if (errors.length) {
    const resolvedErrors = errors.map((so) =>
      so.error
        ? { type: so.type, id: so.id, error: so.error }
        : !so.attributes
        ? { type: so.type, id: so.id, error: { error: `No attributes retrieved` } }
        : { type: so.type, id: so.id, error: { error: `Unknown` } }
    );

    logger.warn(
      `Failed to retrieve ${pkgName}-${pkgVersion} package from ES storage. bulkGet failed for assets: ${JSON.stringify(
        resolvedErrors
      )}`
    );

    return undefined;
  }

  const manifests: Record<string, Buffer> = {};
  const entries: ArchiveEntry[] = assets.map(packageAssetToArchiveEntry);
  const paths: string[] = [];
  entries.forEach(({ path, buffer }) => {
    if (path && buffer) {
      setArchiveEntry(path, buffer);
      paths.push(path);
    }
    paths.push(path);
    if (path.endsWith(MANIFEST_NAME) && buffer) manifests[path] = buffer;
  });
  // // Add asset references to cache
  setArchiveFilelist({ name: pkgName, version: pkgVersion }, paths);

  const packageInfo = parseAndVerifyArchive(paths, manifests);
  setPackageInfo({ name: pkgName, version: pkgVersion, packageInfo });

  return {
    packageInfo,
    paths,
  };
};
