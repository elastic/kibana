/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import Boom from 'boom';
import semver from 'semver';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  CallESAsCurrentUser,
  DefaultPackages,
  AssetType,
  KibanaAssetReference,
  EsAssetReference,
  ElasticsearchAssetType,
} from '../../../types';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import * as Registry from '../registry';
import { getInstallation, getInstallationObject, isRequiredPackage } from './index';
import { installTemplates } from '../elasticsearch/template/install';
import { generateESIndexPatterns } from '../elasticsearch/template/template';
import { installPipelines, deletePipelines } from '../elasticsearch/ingest_pipeline/';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { installKibanaAssets } from '../kibana/assets/install';
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
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
  if (semver.lt(pkgVersion, latestPackage.version))
    throw Boom.badRequest('Cannot install or update to an out-of-date package');

  const paths = await Registry.getArchiveInfo(pkgName, pkgVersion);
  const registryPackageInfo = await Registry.fetchInfo(pkgName, pkgVersion);

  // get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const isUpdate = installedPkg && installedPkg.attributes.version < pkgVersion ? true : false;

  const reinstall = pkgVersion === installedPkg?.attributes.version;
  const removable = !isRequiredPackage(pkgName);
  const { internal = false } = registryPackageInfo;
  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // add the package installation to the saved object
  if (!installedPkg) {
    await createInstallation({
      savedObjectsClient,
      pkgName,
      pkgVersion,
      internal,
      removable,
      installed_kibana: [],
      installed_es: [],
      toSaveESIndexPatterns,
    });
  }

  const installIndexPatternPromise = installIndexPatterns(savedObjectsClient, pkgName, pkgVersion);
  const installKibanaAssetsPromise = installKibanaAssets({
    savedObjectsClient,
    pkgName,
    paths,
    isUpdate,
  });

  // the rest of the installation must happen in sequential order

  // currently only the base package has an ILM policy
  // at some point ILM policies can be installed/modified
  // per dataset and we should then save them
  await installILMPolicy(paths, callCluster);

  // installs versionized pipelines without removing currently installed ones
  const installedPipelines = await installPipelines(
    registryPackageInfo,
    paths,
    callCluster,
    savedObjectsClient
  );
  // install or update the templates referencing the newly installed pipelines
  const installedTemplates = await installTemplates(
    registryPackageInfo,
    isUpdate,
    callCluster,
    paths,
    savedObjectsClient
  );

  // update current backing indices of each data stream
  await updateCurrentWriteIndices(callCluster, installedTemplates);

  // if this is an update, delete the previous version's pipelines
  if (installedPkg && !reinstall) {
    await deletePipelines(
      callCluster,
      savedObjectsClient,
      pkgName,
      installedPkg.attributes.version
    );
  }

  // get template refs to save
  const installedTemplateRefs = installedTemplates.map((template) => ({
    id: template.templateName,
    type: ElasticsearchAssetType.indexTemplate,
  }));

  const [installedKibanaAssets] = await Promise.all([
    installKibanaAssetsPromise,
    installIndexPatternPromise,
  ]);

  await saveInstalledKibanaRefs(savedObjectsClient, pkgName, installedKibanaAssets);
  // update to newly installed version when all assets are successfully installed
  if (isUpdate) await updateVersion(savedObjectsClient, pkgName, pkgVersion);
  return [...installedKibanaAssets, ...installedPipelines, ...installedTemplateRefs];
}
const updateVersion = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) => {
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    version: pkgVersion,
  });
};
export async function createInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  internal: boolean;
  removable: boolean;
  installed_kibana: KibanaAssetReference[];
  installed_es: EsAssetReference[];
  toSaveESIndexPatterns: Record<string, string>;
}) {
  const {
    savedObjectsClient,
    pkgName,
    pkgVersion,
    internal,
    removable,
    installed_kibana: installedKibana,
    installed_es: installedEs,
    toSaveESIndexPatterns,
  } = options;
  await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    {
      installed_kibana: installedKibana,
      installed_es: installedEs,
      es_index_patterns: toSaveESIndexPatterns,
      name: pkgName,
      version: pkgVersion,
      internal,
      removable,
    },
    { id: pkgName, overwrite: true }
  );
  return [...installedKibana, ...installedEs];
}

export const saveInstalledKibanaRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  installedAssets: KibanaAssetReference[]
) => {
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_kibana: installedAssets,
  });
  return installedAssets;
};

export const saveInstalledEsRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  installedAssets: EsAssetReference[]
) => {
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedAssetsToSave = installedPkg?.attributes.installed_es.concat(installedAssets);
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: installedAssetsToSave,
  });
  return installedAssets;
};

export const removeAssetsFromInstalledEsByType = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  assetType: AssetType
) => {
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const installedAssets = installedPkg?.attributes.installed_es;
  if (!installedAssets?.length) return;
  const installedAssetsToSave = installedAssets?.filter(({ id, type }) => {
    return type !== assetType;
  });

  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: installedAssetsToSave,
  });
};
