/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { isBinaryFile } from 'isbinaryfile';
import mime from 'mime-types';
import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'src/core/server';
import { ASSETS_SAVED_OBJECT_TYPE, InstallablePackage, InstallSource } from '../../../../common';
import { cacheGet } from '../archive';

// could be anything, picked this from https://github.com/elastic/elastic-agent-client/issues/17
const MAX_ES_ASSET_BYTES = 4 * 1024 * 1024;

interface AssetsSOAttributes {
  package_name: string;
  package_version: string;
  install_source: string;
  path: string;
  media_type: string;
  data_utf8: string;
  data_base64: string;
}

export const saveArchiveEntriesToES = async ({
  savedObjectsClient,
  paths,
  packageInfo,
  installSource,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  paths: string[];
  packageInfo: InstallablePackage;
  installSource: InstallSource;
}) => {
  const bulkBody = await Promise.all(
    paths.map((path) => {
      const buffer = cacheGet(path);
      if (!buffer) throw new Error(`Could not find ArchiveEntry at ${path}`);
      const { name, version } = packageInfo;
      return archiveEntryToBulkCreateObject({ path, buffer, name, version, installSource });
    })
  );

  const results = await savedObjectsClient.bulkCreate<AssetsSOAttributes>(bulkBody);
  return results;
};

export async function archiveEntryToBulkCreateObject({
  path,
  buffer,
  name,
  version,
  installSource,
}: {
  path: string;
  buffer: Buffer;
  name: string;
  version: string;
  installSource: InstallSource;
}): Promise<SavedObjectsBulkCreateObject<AssetsSOAttributes>> {
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
    type: ASSETS_SAVED_OBJECT_TYPE,
    attributes: {
      package_name: name,
      package_version: version,
      install_source: installSource,
      path,
      media_type: mediaType || '',
      data_utf8: dataUtf8,
      data_base64: dataBase64,
    },
  };
}
