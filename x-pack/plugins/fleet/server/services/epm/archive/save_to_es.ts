/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { isBinaryFile } from 'isbinaryfile';
import mime from 'mime-types';
import uuidv5 from 'uuid/v5';
import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'src/core/server';
import {
  ASSETS_SAVED_OBJECT_TYPE,
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
} from '../../../../common';
import { getArchiveEntry } from './index';

// uuid v5 requires a SHA-1 UUID as a namespace
// used to ensure same input produces the same id
const ID_NAMESPACE = '71403015-cdd5-404b-a5da-6c43f35cad84';

// could be anything, picked this from https://github.com/elastic/elastic-agent-client/issues/17
const MAX_ES_ASSET_BYTES = 4 * 1024 * 1024;

export interface PackageAsset {
  package_name: string;
  package_version: string;
  install_source: string;
  asset_path: string;
  media_type: string;
  data_utf8: string;
  data_base64: string;
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

  // validation: filesize? asset type? anything else
  if (dataUtf8.length > MAX_ES_ASSET_BYTES) {
    throw new Error(`File at ${path} is larger than maximum allowed size of ${MAX_ES_ASSET_BYTES}`);
  }

  if (dataBase64.length > MAX_ES_ASSET_BYTES) {
    throw new Error(
      `After base64 encoding file at ${path} is larger than maximum allowed size of ${MAX_ES_ASSET_BYTES}`
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
  refs: PackageAssetReference[];
}) {
  const { savedObjectsClient, refs } = opts;
  const results = await Promise.all(
    refs.map((ref) => savedObjectsClient.delete(ASSETS_SAVED_OBJECT_TYPE, ref.id))
  );
  return results;
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

  const results = await savedObjectsClient.bulkCreate<PackageAsset>(bulkBody);
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
    id: uuidv5(doc.asset_path, ID_NAMESPACE),
    type: ASSETS_SAVED_OBJECT_TYPE,
    attributes: doc,
  };
}
