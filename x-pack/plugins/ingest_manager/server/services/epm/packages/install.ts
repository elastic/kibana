/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import Boom from 'boom';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  KibanaAssetType,
  CallESAsCurrentUser,
  DefaultPackages,
  ElasticsearchAssetType,
  IngestAssetType,
} from '../../../types';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import * as Registry from '../registry';
import { getObject } from './get_objects';
import { getInstallation, getInstallationObject } from './index';
import { installTemplates } from '../elasticsearch/template/install';
import { generateESIndexPatterns } from '../elasticsearch/template/template';
import { installPipelines } from '../elasticsearch/ingest_pipeline/install';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { deleteAssetsByType, deleteKibanaSavedObjectsAssets } from './remove';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { appContextService } from '../../app_context';

export async function installLatestPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const logger = appContextService.getLogger();
  const { savedObjectsClient, pkgName, callCluster } = options;
  try {
    if (logger) logger.info(`${pkgName} await registry.fetchFindLatestPackage`);
    const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPackage.name,
      version: latestPackage.version,
    });
    if (logger) logger.info(`${pkgName} await installPackage`);
    return installPackage({ savedObjectsClient, pkgkey, callCluster });
  } catch (err) {
    throw err;
  }
}

export async function ensureInstalledDefaultPackages(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<Installation[]> {
  const logger = appContextService.getLogger();
  // ensure base package is installed first
  const baseInstallation = await ensureInstalledPackage({
    savedObjectsClient,
    pkgName: DefaultPackages.base,
    callCluster,
  });

  // don't include base package in list to install in parallel / any order
  const defaultPackages = Object.keys(DefaultPackages).filter(key => key !== DefaultPackages.base);
  const installationPromises = defaultPackages.map(pkgName => {
    if (logger) logger.info(`${pkgName} call ensureInstalledPackage`);
    return ensureInstalledPackage({
      savedObjectsClient,
      pkgName,
      callCluster,
    });
  });

  if (logger) logger.info(`await other default installations`);
  const otherInstallations = await Promise.all(installationPromises);
  if (logger) logger.info(`back from await other default installations`);
  const installations = [baseInstallation, ...otherInstallations];
  if (logger)
    logger.info(
      `ensureInstalledDefaultPackages installations ${JSON.stringify(
        installations.map(({ name, version, installed }) => ({
          name,
          version,
          numInstalled: installed.length,
        })),
        null,
        2
      )}`
    );
  return installations as Installation[];
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
    return getInstallation({ savedObjectsClient, pkgName });
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const logger = appContextService.getLogger();
  if (logger) logger.info(`${options.pkgkey} installPackage`);
  const { savedObjectsClient, pkgkey, callCluster } = options;
  // TODO: change epm API to /packageName/version so we don't need to do this
  const [pkgName, pkgVersion] = pkgkey.split('-');

  // see if some version of this package is already installed
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  if (logger)
    logger.info(
      `${pkgName} await Promise.all( getInstallationObject, Registry.fetchInfo, Registry.fetchFindLatestPackage )`
    );
  const [installedPkg, registryPackageInfo, latestPackage] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchInfo(pkgName, pkgVersion),
    Registry.fetchFindLatestPackage(pkgName),
  ]);
  if (logger)
    logger.info(
      `${pkgName} back from Promise.all( getInstallationObject, Registry.fetchInfo, Registry.fetchFindLatestPackage )`
    );
  if (!registryPackageInfo)
    throw Boom.badRequest(`${pkgName} Cannot find package information for version ${pkgVersion}`);

  if (!latestPackage || pkgVersion < latestPackage.version)
    throw Boom.badRequest('Cannot install or update to an out-of-date package');

  const reinstall = pkgVersion === installedPkg?.attributes.version;
  const { internal = false, removable = true } = registryPackageInfo;

  // delete the previous version's installation's SO kibana assets before installing new ones
  // in case some assets were removed in the new version
  if (installedPkg) {
    try {
      await deleteKibanaSavedObjectsAssets(savedObjectsClient, installedPkg.attributes.installed);
    } catch (err) {
      // log these errors, some assets may not exist if deleted during a failed update
    }
  }

  if (logger) logger.info(`${pkgkey} await Promise.all install assets, pipelines, etc`);
  const [installedKibanaAssets, installedPipelines] = await Promise.all([
    installKibanaAssets({
      savedObjectsClient,
      pkgName,
      pkgVersion,
    }),
    installPipelines(registryPackageInfo, callCluster),
    // index patterns and ilm policies are not currently associated with a particular package
    // so we do not save them in the package saved object state.
    installIndexPatterns(savedObjectsClient, pkgName, pkgVersion),
    // currenly only the base package has an ILM policy
    // at some point ILM policies can be installed/modified
    // per dataset and we should then save them
    installILMPolicy(pkgName, pkgVersion, callCluster),
  ]);
  if (logger) logger.info(`${pkgkey} back from Promise.all install assets, pipelines, etc`);

  // install or update the templates
  if (logger) logger.info(`${pkgkey} await installTemplates`);
  const installedTemplates = await installTemplates(
    registryPackageInfo,
    callCluster,
    pkgName,
    pkgVersion
  );
  if (logger) logger.info(`${pkgkey} back from installTemplates. generateESIndexPatterns`);
  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // get template refs to save
  const installedTemplateRefs = installedTemplates.map(template => ({
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
  if (logger) logger.info('call saveInstallationReferences');
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
