/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import semver from 'semver';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '../../../constants';
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
import { installPipelines, deletePreviousPipelines } from '../elasticsearch/ingest_pipeline/';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import {
  installKibanaAssets,
  getKibanaAssets,
  toAssetReference,
  ArchiveAsset,
} from '../kibana/assets/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { deleteKibanaSavedObjectsAssets } from './remove';
import { PackageOutdatedError } from '../../../errors';
import { getPackageSavedObjects } from './get';

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

export async function installPackage({
  savedObjectsClient,
  pkgkey,
  callCluster,
  force = false,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
  force?: boolean;
}): Promise<AssetReference[]> {
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
  // get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const reinstall = pkgVersion === installedPkg?.attributes.version;
  const reupdate = pkgVersion === installedPkg?.attributes.install_version;

  // let the user install if using the force flag or this is a reinstall or reupdate due to intallation interruption
  if (semver.lt(pkgVersion, latestPackage.version) && !force && !reinstall && !reupdate) {
    throw new PackageOutdatedError(`${pkgkey} is out-of-date and cannot be installed or updated`);
  }
  const paths = await Registry.getArchiveInfo(pkgName, pkgVersion);
  const registryPackageInfo = await Registry.fetchInfo(pkgName, pkgVersion);

  const removable = !isRequiredPackage(pkgName);
  const { internal = false } = registryPackageInfo;
  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // add the package installation to the saved object.
  // if some installation already exists, just update install info
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
  } else {
    await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      install_version: pkgVersion,
      install_status: 'installing',
      install_started_at: new Date().toISOString(),
    });
  }
  const installIndexPatternPromise = installIndexPatterns(savedObjectsClient, pkgName, pkgVersion);
  const kibanaAssets = await getKibanaAssets(paths);
  if (installedPkg)
    await deleteKibanaSavedObjectsAssets(
      savedObjectsClient,
      installedPkg.attributes.installed_kibana
    );
  // save new kibana refs before installing the assets
  const installedKibanaAssetsRefs = await saveKibanaAssetsRefs(
    savedObjectsClient,
    pkgName,
    kibanaAssets
  );
  const installKibanaAssetsPromise = installKibanaAssets({
    savedObjectsClient,
    pkgName,
    kibanaAssets,
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
    callCluster,
    paths,
    savedObjectsClient
  );

  // update current backing indices of each data stream
  await updateCurrentWriteIndices(callCluster, installedTemplates);

  // if this is an update, delete the previous version's pipelines
  if (installedPkg && !reinstall) {
    await deletePreviousPipelines(
      callCluster,
      savedObjectsClient,
      pkgName,
      installedPkg.attributes.version
    );
  }

  const installedTemplateRefs = installedTemplates.map((template) => ({
    id: template.templateName,
    type: ElasticsearchAssetType.indexTemplate,
  }));
  await Promise.all([installKibanaAssetsPromise, installIndexPatternPromise]);
  // update to newly installed version when all assets are successfully installed
  if (installedPkg) await updateVersion(savedObjectsClient, pkgName, pkgVersion);
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    install_version: pkgVersion,
    install_status: 'installed',
  });
  return [...installedKibanaAssetsRefs, ...installedPipelines, ...installedTemplateRefs];
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
      install_version: pkgVersion,
      install_status: 'installing',
      install_started_at: new Date().toISOString(),
    },
    { id: pkgName, overwrite: true }
  );
  return [...installedKibana, ...installedEs];
}

export const saveKibanaAssetsRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  kibanaAssets: ArchiveAsset[]
) => {
  const assetRefs = kibanaAssets.map(toAssetReference);
  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_kibana: assetRefs,
  });
  return assetRefs;
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

export async function ensurePackagesCompletedInstall(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  const installingPackages = await getPackageSavedObjects(savedObjectsClient, {
    searchFields: ['install_status'],
    search: 'installing',
  });
  const installingPromises = installingPackages.saved_objects.reduce<
    Array<Promise<AssetReference[]>>
  >((acc, pkg) => {
    const startDate = pkg.attributes.install_started_at;
    const nowDate = new Date().toISOString();
    const elapsedTime = Date.parse(nowDate) - Date.parse(startDate);
    const pkgkey = `${pkg.attributes.name}-${pkg.attributes.install_version}`;
    // reinstall package
    if (elapsedTime > MAX_TIME_COMPLETE_INSTALL) {
      acc.push(installPackage({ savedObjectsClient, pkgkey, callCluster }));
    }
    return acc;
  }, []);
  await Promise.all(installingPromises);
  return installingPackages;
}
