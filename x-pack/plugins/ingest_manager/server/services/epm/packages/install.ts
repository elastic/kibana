/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import semver from 'semver';
import Boom from 'boom';
import { UnwrapPromise } from '@kbn/utility-types';
import { BulkInstallPackageInfo, IBulkInstallPackageError } from '../../../../common';
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
  InstallType,
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
import { deleteKibanaSavedObjectsAssets, removeInstallation } from './remove';
import { IngestManagerError, PackageOutdatedError } from '../../../errors';
import { getPackageSavedObjects } from './get';
import { installTransformForDataset } from '../elasticsearch/transform/install';
import { appContextService } from '../../app_context';
import { formatBulkInstallError } from '../../../errors/handlers';

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

function isBulkInstallError(resp: BulkInstallResponse): resp is IBulkInstallPackageError {
  return 'error' in resp && resp.error !== undefined;
}

async function getInstallationAndName(
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string
) {
  return {
    pkgName,
    installation: await getInstallation({ savedObjectsClient, pkgName }),
  };
}

type GetInstallationReturnType = UnwrapPromise<ReturnType<typeof getInstallationAndName>>;
export async function ensureInstalledDefaultPackages(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<GetInstallationReturnType[]> {
  const installations = [];
  const bulkResponse = await bulkInstallPackages({
    savedObjectsClient,
    packagesToUpgrade: Object.values(DefaultPackages),
    callCluster,
  });

  for (const resp of bulkResponse) {
    if (isBulkInstallError(resp)) {
      if (resp.error instanceof Error) {
        throw resp.error;
      } else {
        throw new Error(resp.error);
      }
    } else {
      const installation = getInstallationAndName(savedObjectsClient, resp.name);
      installations.push(installation);
    }
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

export async function handleInstallPackageFailure({
  savedObjectsClient,
  error,
  pkgName,
  pkgVersion,
  installedPkg,
  callCluster,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  error: IngestManagerError | Boom | Error;
  pkgName: string;
  pkgVersion: string;
  installedPkg: SavedObject<Installation> | undefined;
  callCluster: CallESAsCurrentUser;
}) {
  if (error instanceof IngestManagerError) {
    return;
  }
  const logger = appContextService.getLogger();
  const pkgkey = Registry.pkgToPkgKey({
    name: pkgName,
    version: pkgVersion,
  });

  // if there is an unknown server error, uninstall any package assets or reinstall the previous version if update
  try {
    const installType = getInstallType({ pkgVersion, installedPkg });
    if (installType === 'install' || installType === 'reinstall') {
      logger.error(`uninstalling ${pkgkey} after error installing`);
      await removeInstallation({ savedObjectsClient, pkgkey, callCluster });
    }

    if (installType === 'update') {
      if (!installedPkg) {
        logger.error(
          `failed to rollback package after installation error ${error} because saved object was undefined`
        );
        return;
      }
      const prevVersion = `${pkgName}-${installedPkg.attributes.version}`;
      logger.error(`rolling back to ${prevVersion} after error installing ${pkgkey}`);
      await installPackage({
        savedObjectsClient,
        pkgkey: prevVersion,
        callCluster,
      });
    }
  } catch (e) {
    logger.error(`failed to uninstall or rollback package after installation error ${e}`);
  }
}

type BulkInstallResponse = BulkInstallPackageInfo | IBulkInstallPackageError;
function bulkInstallErrorToOptions({
  pkgToUpgrade,
  error,
}: {
  pkgToUpgrade: string;
  error: Error;
}): IBulkInstallPackageError {
  const { statusCode, error: err } = formatBulkInstallError(error);
  return {
    name: pkgToUpgrade,
    statusCode,
    error: err,
  };
}

interface UpgradePackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  installedPkg: UnwrapPromise<ReturnType<typeof getInstallationObject>>;
  latestPkg: UnwrapPromise<ReturnType<typeof Registry.fetchFindLatestPackage>>;
  pkgToUpgrade: string;
}
async function upgradePackage({
  savedObjectsClient,
  callCluster,
  installedPkg,
  latestPkg,
  pkgToUpgrade,
}: UpgradePackageParams): Promise<BulkInstallResponse> {
  if (!installedPkg || semver.gt(latestPkg.version, installedPkg.attributes.version)) {
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPkg.name,
      version: latestPkg.version,
    });

    try {
      const assets = await installPackage({ savedObjectsClient, pkgkey, callCluster });
      return {
        name: pkgToUpgrade,
        newVersion: latestPkg.version,
        oldVersion: installedPkg?.attributes.version ?? null,
        assets,
      };
    } catch (installFailed) {
      await handleInstallPackageFailure({
        savedObjectsClient,
        error: installFailed,
        pkgName: latestPkg.name,
        pkgVersion: latestPkg.version,
        installedPkg,
        callCluster,
      });
      return bulkInstallErrorToOptions({ pkgToUpgrade, error: installFailed });
    }
  } else {
    // package was already at the latest version
    return {
      name: pkgToUpgrade,
      newVersion: latestPkg.version,
      oldVersion: latestPkg.version,
      assets: [
        ...installedPkg.attributes.installed_es,
        ...installedPkg.attributes.installed_kibana,
      ],
    };
  }
}

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToUpgrade: string[];
  callCluster: CallESAsCurrentUser;
}
export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToUpgrade,
  callCluster,
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const installedAndLatestPromises = packagesToUpgrade.map((pkgToUpgrade) =>
    Promise.all([
      getInstallationObject({ savedObjectsClient, pkgName: pkgToUpgrade }),
      Registry.fetchFindLatestPackage(pkgToUpgrade),
    ])
  );
  const installedAndLatestResults = await Promise.allSettled(installedAndLatestPromises);
  const installResponsePromises = installedAndLatestResults.map(async (result, index) => {
    const pkgToUpgrade = packagesToUpgrade[index];
    if (result.status === 'fulfilled') {
      const [installedPkg, latestPkg] = result.value;
      return upgradePackage({
        savedObjectsClient,
        callCluster,
        installedPkg,
        latestPkg,
        pkgToUpgrade,
      });
    } else {
      return bulkInstallErrorToOptions({ pkgToUpgrade, error: result.reason });
    }
  });
  const installResults = await Promise.allSettled(installResponsePromises);
  const installResponses = installResults.map((result, index) => {
    const pkgToUpgrade = packagesToUpgrade[index];
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return bulkInstallErrorToOptions({ pkgToUpgrade, error: result.reason });
    }
  });

  return installResponses;
}

interface InstallPackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
  force?: boolean;
}

export async function installPackage({
  savedObjectsClient,
  pkgkey,
  callCluster,
  force = false,
}: InstallPackageParams): Promise<AssetReference[]> {
  // TODO: change epm API to /packageName/version so we don't need to do this
  const { pkgName, pkgVersion } = Registry.splitPkgKey(pkgkey);
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
  // get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });

  const installType = getInstallType({ pkgVersion, installedPkg });

  // let the user install if using the force flag or needing to reinstall or install a previous version due to failed update
  const installOutOfDateVersionOk =
    installType === 'reinstall' || installType === 'reupdate' || installType === 'rollback';
  if (semver.lt(pkgVersion, latestPackage.version) && !force && !installOutOfDateVersionOk) {
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

  const installedTransforms = await installTransformForDataset(
    registryPackageInfo,
    paths,
    callCluster,
    savedObjectsClient
  );

  // if this is an update or retrying an update, delete the previous version's pipelines
  if ((installType === 'update' || installType === 'reupdate') && installedPkg) {
    await deletePreviousPipelines(
      callCluster,
      savedObjectsClient,
      pkgName,
      installedPkg.attributes.version
    );
  }
  // pipelines from a different version may have installed during a failed update
  if (installType === 'rollback' && installedPkg) {
    await deletePreviousPipelines(
      callCluster,
      savedObjectsClient,
      pkgName,
      installedPkg.attributes.install_version
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
  return [
    ...installedKibanaAssetsRefs,
    ...installedPipelines,
    ...installedTemplateRefs,
    ...installedTransforms,
  ];
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

interface NoPkgArgs {
  pkgVersion: string;
  installedPkg?: undefined;
}

interface HasPkgArgs {
  pkgVersion: string;
  installedPkg: SavedObject<Installation>;
}

type OnlyInstall = Extract<InstallType, 'install'>;
type NotInstall = Exclude<InstallType, 'install'>;

// overloads
export function getInstallType(args: NoPkgArgs): OnlyInstall;
export function getInstallType(args: HasPkgArgs): NotInstall;
export function getInstallType(args: NoPkgArgs | HasPkgArgs): OnlyInstall | NotInstall;

// implementation
export function getInstallType(args: NoPkgArgs | HasPkgArgs): OnlyInstall | NotInstall {
  const { pkgVersion, installedPkg } = args;
  if (!installedPkg) return 'install';

  const currentPkgVersion = installedPkg.attributes.version;
  const lastStartedInstallVersion = installedPkg.attributes.install_version;

  if (pkgVersion === currentPkgVersion && pkgVersion !== lastStartedInstallVersion)
    return 'rollback';
  if (pkgVersion === currentPkgVersion) return 'reinstall';
  if (pkgVersion === lastStartedInstallVersion && pkgVersion !== currentPkgVersion)
    return 'reupdate';
  if (pkgVersion !== lastStartedInstallVersion && pkgVersion !== currentPkgVersion) return 'update';
  throw new Error('unknown install type');
}
