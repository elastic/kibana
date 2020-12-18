/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { uniq } from 'lodash';
import yaml from 'js-yaml';
import { isBinaryFile } from 'isbinaryfile';
import mime from 'mime-types';
import uuidv5 from 'uuid/v5';
import { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from 'src/core/server';
import {
  ASSETS_SAVED_OBJECT_TYPE,
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
  RegistryDataStream,
} from '../../../../common';
import { ArchiveEntry, getArchiveEntry, setArchiveEntry, setArchiveFilelist } from './index';
import { parseAndVerifyPolicyTemplates, parseAndVerifyStreams } from './validation';
import { pkgToPkgKey } from '../registry';

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
  const assetSavedObject = await savedObjectsClient.get<PackageAsset>(
    ASSETS_SAVED_OBJECT_TYPE,
    assetPathToObjectId(path)
  );
  const storedAsset = assetSavedObject?.attributes;
  if (!storedAsset) {
    return;
  }

  return storedAsset;
}
export async function getAssetsFromReferences(opts: {
  savedObjectsClient: SavedObjectsClientContract;
  references: PackageAssetReference[];
}): Promise<PackageAsset[]> {
  const { savedObjectsClient, references } = opts;
  const bulkRes = await savedObjectsClient.bulkGet<PackageAsset>(references);
  return bulkRes.saved_objects.map((so) => so.attributes);
}
export const getEsPackage = async (
  pkgName: string,
  pkgVersion: string,
  references: PackageAssetReference[],
  savedObjectsClient: SavedObjectsClientContract
) => {
  const pkgKey = pkgToPkgKey({ name: pkgName, version: pkgVersion });
  const assets = await getAssetsFromReferences({ references, savedObjectsClient });

  // add asset references to cache
  const paths: string[] = [];
  const entries: ArchiveEntry[] = assets.map(packageAssetToArchiveEntry);
  entries.forEach(({ path, buffer }) => {
    if (path && buffer) {
      setArchiveEntry(path, buffer);
      paths.push(path);
    }
  });
  setArchiveFilelist({ name: pkgName, version: pkgVersion }, paths);
  // create the packageInfo
  // TODO: this is mostly copied from validtion.ts, but we should save packageInfo somewhere
  // so we don't need to do this again as this was already done either in registry or through upload

  const manifestPath = `${pkgName}-${pkgVersion}/manifest.yml`;
  const soResManifest = await savedObjectsClient.find<PackageAsset>({
    type: ASSETS_SAVED_OBJECT_TYPE,
    perPage: 1,
    page: 1,
    filter: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_name:${pkgName} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version:${pkgVersion} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.asset_path:${manifestPath}`,
  });
  const packageInfo = yaml.load(soResManifest.saved_objects[0].attributes.data_utf8);

  const readmePath = `${pkgName}-${pkgVersion}/docs/README.md`;
  const readmeRes = await savedObjectsClient.find<PackageAsset>({
    type: ASSETS_SAVED_OBJECT_TYPE,
    perPage: 1,
    page: 1,
    filter: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_name:${pkgName} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version:${pkgVersion} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.asset_path:${readmePath}`,
  });
  if (readmeRes.total > 0) {
    packageInfo.readme = `package/${readmePath}`;
  }

  let dataStreamPaths: string[] = [];
  const dataStreams: RegistryDataStream[] = [];
  paths
    .filter((path) => path.startsWith(`${pkgKey}/data_stream/`))
    .forEach((path) => {
      const parts = path.split('/');
      if (parts.length > 2 && parts[2]) dataStreamPaths.push(parts[2]);
    });

  dataStreamPaths = uniq(dataStreamPaths);

  await Promise.all(
    dataStreamPaths.map(async (dataStreamPath) => {
      const dataStreamManifestPath = `${pkgKey}/data_stream/${dataStreamPath}/manifest.yml`;
      const soResDataStreamManifest = await savedObjectsClient.find<PackageAsset>({
        type: ASSETS_SAVED_OBJECT_TYPE,
        perPage: 1,
        page: 1,
        filter: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_name:${pkgName} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version:${pkgVersion} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.asset_path:${dataStreamManifestPath}`,
      });
      const dataStreamManifest = yaml.load(
        soResDataStreamManifest.saved_objects[0].attributes.data_utf8
      );

      const {
        title: dataStreamTitle,
        release,
        ingest_pipeline: ingestPipeline,
        type,
        dataset,
      } = dataStreamManifest;
      const streams = parseAndVerifyStreams(dataStreamManifest, dataStreamPath);

      dataStreams.push({
        dataset: dataset || `${pkgName}.${dataStreamPath}`,
        title: dataStreamTitle,
        release,
        package: pkgName,
        ingest_pipeline: ingestPipeline || 'default',
        path: dataStreamPath,
        type,
        streams,
      });
    })
  );
  packageInfo.policy_templates = parseAndVerifyPolicyTemplates(packageInfo);
  packageInfo.data_streams = dataStreams;
  packageInfo.assets = paths.map((path) => {
    return path.replace(`${pkgName}-${pkgVersion}`, `/package/${pkgName}/${pkgVersion}`);
  });

  return {
    paths,
    packageInfo,
  };
};
