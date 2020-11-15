/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mime from 'mime-types';
import { SavedObjectsClientContract } from 'src/core/server';
import { ASSETS_SAVED_OBJECT_TYPE, InstallablePackage, InstallSource } from '../../../../common';
import { cacheGet } from '../archive';

// could be anything, picked this from https://github.com/elastic/elastic-agent-client/issues/17
const MAX_ES_ASSET_BYTES = 4194304;

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
  const bulkBody = paths.map((path) => {
    const buffer = cacheGet(path);
    if (!buffer) throw new Error(`Could not find ArchiveEntry at ${path}`);
    const contentType = mime.lookup(path);
    const mediaType = mime.contentType(contentType || path);
    // can use to create a data URL like `data:${mediaType};base64,${base64Data}`

    const { dataUtf8, dataBase64 } = getAssetString({ buffer, contentType });

    // validation: filesize? asset type? anything else
    if (dataUtf8.length > MAX_ES_ASSET_BYTES) {
      throw new Error(
        `File at ${path} is larger than maximum allowed size of ${MAX_ES_ASSET_BYTES}`
      );
    }

    if (dataBase64.length > MAX_ES_ASSET_BYTES) {
      throw new Error(
        `After base64 encoding file at ${path} is larger than maximum allowed size of ${MAX_ES_ASSET_BYTES}`
      );
    }

    const savedObjectShape = {
      type: ASSETS_SAVED_OBJECT_TYPE,
      attributes: {
        package_name: packageInfo.name,
        package_version: packageInfo.version,
        install_source: installSource,
        path,
        media_type: mediaType || '',
        data_utf8: dataUtf8,
        data_base64: dataBase64,
      },
    };

    return savedObjectShape;
  });

  const results = await savedObjectsClient.bulkCreate<AssetsSOAttributes>(bulkBody);

  return results;
};

export const getAssetString = ({
  buffer,
  contentType,
}: {
  buffer: Buffer;
  contentType?: string | false;
}) => {
  // lots of flexibility here, this is just one example
  // const isImage = contentType && contentType.startsWith('image');
  // const isSvg = isImage && contentType && contentType.includes('image/svg');
  // return isImage && !isSvg;
  // both of these miss .DS_Store
  const asUtf8 = buffer.toString('utf8');
  const needsBase64 = buffer.length !== asUtf8.length;
  const assetString = needsBase64 ? buffer.toString('base64') : asUtf8;

  return { dataUtf8: needsBase64 ? '' : assetString, dataBase64: needsBase64 ? assetString : '' };
};
