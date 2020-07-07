/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import Boom from 'boom';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  CallESAsCurrentUser,
  DefaultPackages,
  ElasticsearchAssetType,
  IngestAssetType,
} from '../../../types';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import * as Registry from '../registry';
import { installKibanaAssets } from '../kibana/assets/install';
import { getInstallation, getInstallationObject, isRequiredPackage } from './index';
import { installTemplates } from '../elasticsearch/template/install';
import { generateESIndexPatterns } from '../elasticsearch/template/template';
import { installPipelines } from '../elasticsearch/ingest_pipeline/install';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { deleteAssetsByType, deleteKibanaSavedObjectsAssets } from './remove';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

export async function installLatestPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  try {
    const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPackage.name,
      version: latestPackage.version,
    });
    return installPackage({ savedObjectsClient, pkgkey, callCluster });
  } catch (err) {
    throw err;
  }
}

export async function ensureInstalledDefaultPackages(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<Installation[]> {
  const installations = [];
  for (const pkgName in DefaultPackages) {
    if (!DefaultPackages.hasOwnProperty(pkgName)) continue;
    const installation = ensureInstalledPackage({
      savedObjectsClient,
      pkgName,
      callCluster,
    });
    installations.push(installation);
  }

  return Promise.all(installations);
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<Installation> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const installedPackage = await getInstallation({ savedObjectsClient, pkgName });
  if (installedPackage) {
    return installedPackage;
  }
  // if the requested packaged was not found to be installed, install
  await installLatestPackage({
    savedObjectsClient,
    pkgName,
    callCluster,
  });
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  if (!installation) throw new Error(`could not get installation ${pkgName}`);
  return installation;
}

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  // TODO: change epm API to /packageName/version so we don't need to do this
  const [pkgName, pkgVersion] = pkgkey.split('-');
  const paths = await Registry.getArchiveInfo(pkgName, pkgVersion);
  // see if some version of this package is already installed
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const registryPackageInfo = await Registry.fetchInfo(pkgName, pkgVersion);
  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);

  if (pkgVersion < latestPackage.version)
    throw Boom.badRequest('Cannot install or update to an out-of-date package');

  const reinstall = pkgVersion === installedPkg?.attributes.version;
  const removable = !isRequiredPackage(pkgName);
  const { internal = false } = registryPackageInfo;

  // delete the previous version's installation's SO kibana assets before installing new ones
  // in case some assets were removed in the new version
  if (installedPkg) {
    try {
      await deleteKibanaSavedObjectsAssets(savedObjectsClient, installedPkg.attributes.installed);
    } catch (err) {
      // log these errors, some assets may not exist if deleted during a failed update
    }
  }

  const [installedKibanaAssets, installedPipelines] = await Promise.all([
    installKibanaAssets({
      savedObjectsClient,
      pkgName,
      paths,
    }),
    installPipelines(registryPackageInfo, paths, callCluster),
    // index patterns and ilm policies are not currently associated with a particular package
    // so we do not save them in the package saved object state.
    installIndexPatterns(savedObjectsClient, pkgName, pkgVersion),
    // currenly only the base package has an ILM policy
    // at some point ILM policies can be installed/modified
    // per dataset and we should then save them
    installILMPolicy(paths, callCluster),
  ]);

  // install or update the templates
  const installedTemplates = await installTemplates(
    registryPackageInfo,
    callCluster,
    pkgName,
    pkgVersion,
    paths
  );
  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // get template refs to save
  const installedTemplateRefs = installedTemplates.map((template) => ({
    id: template.templateName,
    type: IngestAssetType.IndexTemplate,
  }));

  if (installedPkg) {
    // update current index for every index template created
    await updateCurrentWriteIndices(callCluster, installedTemplates);
    if (!reinstall) {
      try {
        // delete the previous version's installation's pipelines
        // this must happen after the template is updated
        await deleteAssetsByType({
          savedObjectsClient,
          callCluster,
          installedObjects: installedPkg.attributes.installed,
          assetType: ElasticsearchAssetType.ingestPipeline,
        });
      } catch (err) {
        throw new Error(err.message);
      }
    }
  }
  const toSaveAssetRefs: AssetReference[] = [
    ...installedKibanaAssets,
    ...installedPipelines,
    ...installedTemplateRefs,
  ];
  // Save references to installed assets in the package's saved object state
  return saveInstallationReferences({
    savedObjectsClient,
    pkgName,
    pkgVersion,
    internal,
    removable,
    toSaveAssetRefs,
    toSaveESIndexPatterns,
  });
}

export async function saveInstallationReferences(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  internal: boolean;
  removable: boolean;
  toSaveAssetRefs: AssetReference[];
  toSaveESIndexPatterns: Record<string, string>;
}) {
  const {
    savedObjectsClient,
    pkgName,
    pkgVersion,
    internal,
    removable,
    toSaveAssetRefs,
    toSaveESIndexPatterns,
  } = options;

  await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed: toSaveAssetRefs,
      es_index_patterns: toSaveESIndexPatterns,
      name: pkgName,
      version: pkgVersion,
      internal,
      removable,
    },
    { id: pkgName, overwrite: true }
  );

  return toSaveAssetRefs;
}
