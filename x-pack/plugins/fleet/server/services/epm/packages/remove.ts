/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import Boom from '@hapi/boom';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  AssetType,
  CallESAsCurrentUser,
  ElasticsearchAssetType,
  EsAssetReference,
  KibanaAssetReference,
  Installation,
} from '../../../types';
import { getInstallation, savedObjectTypes } from './index';
import { deletePipeline } from '../elasticsearch/ingest_pipeline/';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import { deleteTransforms } from '../elasticsearch/transform/remove';
import { packagePolicyService, appContextService } from '../..';
import { splitPkgKey } from '../registry';
import { deletePackageCache } from '../archive';
import { removeArchiveEntries } from '../archive/save_to_es';

export async function removeInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  // TODO:  the epm api should change to /name/version so we don't need to do this
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) throw Boom.badRequest(`${pkgName} is not installed`);
  if (installation.removable === false)
    throw Boom.badRequest(`${pkgName} is installed by default and cannot be removed`);

  const { total } = await packagePolicyService.list(savedObjectsClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
    page: 0,
    perPage: 0,
  });

  if (total > 0)
    throw Boom.badRequest(
      `unable to remove package with existing package policy(s) in use by agent(s)`
    );

  // Delete the installed assets. Don't include installation.package_assets. Those are irrelevant to users
  const installedAssets = [...installation.installed_kibana, ...installation.installed_es];
  await deleteAssets(installation, savedObjectsClient, callCluster);

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await savedObjectsClient.delete(PACKAGES_SAVED_OBJECT_TYPE, pkgName);

  // recreate or delete index patterns when a package is uninstalled
  // this must be done after deleting the saved object for the current package otherwise it will retrieve the package
  // from the registry again and reinstall the index patterns
  await installIndexPatterns(savedObjectsClient);

  // remove the package archive and its contents from the cache so that a reinstall fetches
  // a fresh copy from the registry
  deletePackageCache({
    name: pkgName,
    version: pkgVersion,
  });

  await removeArchiveEntries({ savedObjectsClient, refs: installation.package_assets });

  // successful delete's in SO client return {}. return something more useful
  return installedAssets;
}

function deleteKibanaAssets(
  installedObjects: KibanaAssetReference[],
  savedObjectsClient: SavedObjectsClientContract
) {
  return installedObjects.map(async ({ id, type }) => {
    return savedObjectsClient.delete(type, id);
  });
}

function deleteESAssets(installedObjects: EsAssetReference[], callCluster: CallESAsCurrentUser) {
  return installedObjects.map(async ({ id, type }) => {
    const assetType = type as AssetType;
    if (assetType === ElasticsearchAssetType.ingestPipeline) {
      return deletePipeline(callCluster, id);
    } else if (assetType === ElasticsearchAssetType.indexTemplate) {
      return deleteTemplate(callCluster, id);
    } else if (assetType === ElasticsearchAssetType.transform) {
      return deleteTransforms(callCluster, [id]);
    }
  });
}

async function deleteAssets(
  { installed_es: installedEs, installed_kibana: installedKibana }: Installation,
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const logger = appContextService.getLogger();

  const deletePromises: Array<Promise<unknown>> = [
    ...deleteESAssets(installedEs, callCluster),
    ...deleteKibanaAssets(installedKibana, savedObjectsClient),
  ];

  try {
    await Promise.all(deletePromises);
  } catch (err) {
    logger.error(err);
  }
}

async function deleteTemplate(callCluster: CallESAsCurrentUser, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*') {
    try {
      const callClusterParams: {
        method: string;
        path: string;
        ignore: number[];
      } = {
        method: 'DELETE',
        path: `/_index_template/${name}`,
        ignore: [404],
      };
      // This uses the catch-all endpoint 'transport.request' because there is no
      // convenience endpoint using the new _index_template API yet.
      // The existing convenience endpoint `indices.putTemplate` only sends to _template,
      // which does not support v2 templates.
      // See src/core/server/elasticsearch/api_types.ts for available endpoints.
      await callCluster('transport.request', callClusterParams);
    } catch {
      throw new Error(`error deleting template ${name}`);
    }
  }
}

export async function deleteKibanaSavedObjectsAssets(
  savedObjectsClient: SavedObjectsClientContract,
  installedRefs: AssetReference[]
) {
  if (!installedRefs.length) return;

  const logger = appContextService.getLogger();
  const deletePromises = installedRefs.map(({ id, type }) => {
    const assetType = type as AssetType;

    if (savedObjectTypes.includes(assetType)) {
      return savedObjectsClient.delete(assetType, id);
    }
  });
  try {
    await Promise.all(deletePromises);
  } catch (err) {
    logger.warn(err);
  }
}
