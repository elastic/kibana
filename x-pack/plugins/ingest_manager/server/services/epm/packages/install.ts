/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  KibanaAssetType,
  CallESAsCurrentUser,
  DefaultPackages,
} from '../../../types';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import * as Registry from '../registry';
import { getObject } from './get_objects';
import { getInstallation } from './index';
import { installTemplates } from '../elasticsearch/template/install';
import { installPipelines } from '../elasticsearch/ingest_pipeline/install';
import { installILMPolicy } from '../elasticsearch/ilm/install';

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
    const installation = await ensureInstalledPackage({
      savedObjectsClient,
      pkgName,
      callCluster,
    });
    if (installation) installations.push(installation);
  }

  return installations;
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<Installation | undefined> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const installedPackage = await getInstallation({ savedObjectsClient, pkgName });
  if (installedPackage) {
    return installedPackage;
  }
  // if the requested packaged was not found to be installed, try installing
  try {
    await installLatestPackage({
      savedObjectsClient,
      pkgName,
      callCluster,
    });
    return await getInstallation({ savedObjectsClient, pkgName });
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  // TODO: change epm API to /packageName/version so we don't need to do this
  const [pkgName, pkgVersion] = pkgkey.split('-');
  const registryPackageInfo = await Registry.fetchInfo(pkgName, pkgVersion);
  const { internal = false } = registryPackageInfo;

  const installKibanaAssetsPromise = installKibanaAssets({
    savedObjectsClient,
    pkgName,
    pkgVersion,
  });
  const installPipelinePromises = installPipelines(registryPackageInfo, callCluster);
  const installTemplatePromises = installTemplates(
    registryPackageInfo,
    callCluster,
    pkgName,
    pkgVersion
  );

  // index patterns and ilm policies are not currently associated with a particular package
  // so we do not save them in the package saved object state.  at some point ILM policies can be installed/modified
  // per dataset and we should then save them
  await installIndexPatterns(savedObjectsClient, pkgName, pkgVersion);
  // currenly only the base package has an ILM policy
  await installILMPolicy(pkgName, pkgVersion, callCluster);

  const res = await Promise.all([
    installKibanaAssetsPromise,
    installPipelinePromises,
    installTemplatePromises,
  ]);

  const toSave = res.flat();
  // Save those references in the package manager's state saved object
  await saveInstallationReferences({
    savedObjectsClient,
    pkgkey,
    pkgName,
    pkgVersion,
    internal,
    toSave,
  });
  return toSave;
}

// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installKibanaAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
}) {
  const { savedObjectsClient, pkgName, pkgVersion } = options;

  // Only install Kibana assets during package installation.
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installationPromises = kibanaAssetTypes.map(async assetType =>
    installKibanaSavedObjects({ savedObjectsClient, pkgName, pkgVersion, assetType })
  );

  // installKibanaSavedObjects returns AssetReference[], so .map creates AssetReference[][]
  // call .flat to flatten into one dimensional array
  return Promise.all(installationPromises).then(results => results.flat());
}

export async function saveInstallationReferences(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  pkgName: string;
  pkgVersion: string;
  internal: boolean;
  toSave: AssetReference[];
}) {
  const { savedObjectsClient, pkgName, pkgVersion, internal, toSave } = options;
  const installation = await getInstallation({ savedObjectsClient, pkgName });
  const savedRefs = installation?.installed || [];
  const mergeRefsReducer = (current: AssetReference[], pending: AssetReference) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);
    return current;
  };

  const toInstall = toSave.reduce(mergeRefsReducer, savedRefs);
  await savedObjectsClient.create<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    { installed: toInstall, name: pkgName, version: pkgVersion, internal },
    { id: pkgName, overwrite: true }
  );

  return toInstall;
}

async function installKibanaSavedObjects({
  savedObjectsClient,
  pkgName,
  pkgVersion,
  assetType,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  assetType: KibanaAssetType;
}) {
  const isSameType = ({ path }: Registry.ArchiveEntry) =>
    assetType === Registry.pathParts(path).type;
  const paths = await Registry.getArchiveInfo(pkgName, pkgVersion, isSameType);
  const toBeSavedObjects = await Promise.all(paths.map(getObject));

  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, {
      overwrite: true,
    });
    const createdObjects = createResults.saved_objects;
    const installed = createdObjects.map(toAssetReference);
    return installed;
  }
}

function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaAssetType };

  return reference;
}
