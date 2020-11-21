/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { isBinaryFile } from 'isbinaryfile';
import mime from 'mime-types';
import {
  PACKAGE_ASSETS_INDEX_NAME,
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
} from '../../../../common';
import { CallESAsCurrentUser } from '../../../types';
import { appContextService } from '../../../services';
import { getArchiveEntry } from './index';

// could be anything, picked this from https://github.com/elastic/elastic-agent-client/issues/17
const MAX_ES_ASSET_BYTES = 4 * 1024 * 1024;

const packageAssetMappings = {
  package_name: { type: 'keyword' },
  package_version: { type: 'keyword' },
  install_source: { type: 'keyword' },
  asset_path: { type: 'keyword' },
  media_type: { type: 'keyword' },
  data_utf8: { type: 'text', index: false },
  data_base64: { type: 'binary' },
};

export interface PackageAsset {
  package_name: string;
  package_version: string;
  install_source: string;
  asset_path: string;
  media_type: string;
  data_utf8: string;
  data_base64: string;
}

export const ensurePackagesIndex = async (opts: { callCluster: CallESAsCurrentUser }) => {
  const { callCluster } = opts;
  const logger = appContextService.getLogger();
  const indexExists = await callCluster('indices.exists', { index: PACKAGE_ASSETS_INDEX_NAME });
  if (!indexExists) {
    try {
      const clientParams = {
        index: PACKAGE_ASSETS_INDEX_NAME,
        body: {
          mappings: {
            properties: packageAssetMappings,
          },
        },
      };
      await callCluster('indices.create', clientParams);
    } catch (putErr) {
      logger.error(`${PACKAGE_ASSETS_INDEX_NAME} could not be created`);
    }
  }
};

export const saveArchiveEntriesToES = async (opts: {
  callCluster: CallESAsCurrentUser;
  paths: string[];
  packageInfo: InstallablePackage;
  installSource: InstallSource;
}) => {
  const { callCluster, paths, packageInfo, installSource } = opts;
  await ensurePackagesIndex({ callCluster });
  const bulkBody = await createBulkBody({ paths, packageInfo, installSource });
  const results: BulkResponse = await callCluster('bulk', { body: bulkBody });
  return results;
};

export async function createBulkBody(opts: {
  paths: string[];
  packageInfo: InstallablePackage;
  installSource: InstallSource;
}) {
  const { paths, packageInfo, installSource } = opts;
  const bulkBody = await Promise.all(
    paths.map(async (path) => {
      const buffer = getArchiveEntry(path);
      if (!buffer) throw new Error(`Could not find ArchiveEntry at ${path}`);
      const { name, version } = packageInfo;
      const doc = await archiveEntryToESDocument({ path, buffer, name, version, installSource });
      const action = {
        index: { _index: PACKAGE_ASSETS_INDEX_NAME, _id: doc.asset_path },
      };

      return [action, doc];
    })
  );

  return bulkBody.flat();
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

export async function removeArchiveEntriesFromES(opts: {
  callCluster: CallESAsCurrentUser;
  refs: PackageAssetReference[];
}) {
  const bulkBody = opts.refs.map(({ id }) => {
    return {
      delete: { _index: PACKAGE_ASSETS_INDEX_NAME, _id: id },
    };
  });
  const results: BulkResponse = await opts.callCluster('bulk', { body: bulkBody });
  return results;
}

// based on plugins/security_solution/server/lib/detection_engine/signals/types.ts
// ideally we use proper/official types
type BulkItem = Record<
  'create' | 'delete' | 'index' | 'update',
  {
    _index: string;
    _type?: string;
    _id: string;
    _version: number;
    result?: 'created' | 'deleted' | 'updated';
    _shards?: {
      total: number;
      successful: number;
      failed: number;
    };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid?: string;
      shard: string;
      index: string;
    };
  }
>;
interface BulkResponse {
  took: number;
  errors: boolean;
  items: BulkItem[];
}
