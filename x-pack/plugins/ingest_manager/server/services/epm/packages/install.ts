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

export async function installLatestPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const start = Date.now();
  const last = start;
  try {
    console.log(new Date(), `await Registry.fetchFindLatestPackage ${pkgName}`);
    const latestPackage = await Registry.fetchFindLatestPackage(pkgName);
    console.log(new Date(), 'took', Date.now() - start);
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPackage.name,
      version: latestPackage.version,
    });
    console.log(new Date(), 'return installPackage');
    return installPackage({ savedObjectsClient, pkgkey, callCluster });
  } catch (err) {
    throw err;
  }
}

export async function ensureInstalledDefaultPackages(
  savedObjectsClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
): Promise<Installation[]> {
  const start = Date.now();
  // ensure base package is installed first
  const baseInstallation = await ensureInstalledPackage({
    savedObjectsClient,
    pkgName: DefaultPackages.base,
    callCluster,
  });

  // don't include base package in list to install in parallel / any order
  const defaultPackages = Object.keys(DefaultPackages).filter(key => key !== DefaultPackages.base);
  const otherInstallations = await Promise.all(
    defaultPackages.map(
      pkgName =>
        console.log(new Date(), `start ensureInstalledPackage ${pkgName}`) ||
        ensureInstalledPackage({
          savedObjectsClient,
          pkgName,
          callCluster,
        }).then(
          value =>
            console.log(new Date(), `end ensureInstalledPackage ${pkgName}`, Date.now() - start) ||
            value
        )
    )
  );

  // `ensureInstalledPackage` return Installation | undefined
  // filter out any undefined values
  // we need the `is Installation` guard because of some TS issues
  // https://github.com/microsoft/TypeScript/issues/20707#issuecomment-351874491
  // https://github.com/microsoft/TypeScript/issues/20812
  // https://github.com/microsoft/TypeScript/issues/16069
  const installations = [baseInstallation, ...otherInstallations].filter(
    (installation: Installation | undefined): installation is Installation => {
      return installation !== undefined;
    }
  );

  return installations;
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<Installation | undefined> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const start = Date.now();
  let last = start;
  console.log(new Date(), `start ensureInstalledPackage ${pkgName}`);
  const installedPackage = await getInstallation({ savedObjectsClient, pkgName });
  console.log(
    new Date(),
    `end ensureInstalledPackage ${pkgName}`,
    Date.now() - last,
    (last = Date.now()) - start
  );
  if (installedPackage) {
    return installedPackage;
  }
  // if the requested packaged was not found to be installed, try installing
  try {
    console.log(new Date(), `start installLatestPackage ${pkgName}`);
    await installLatestPackage({
      savedObjectsClient,
      pkgName,
      callCluster,
    });
    console.log(
      new Date(),
      `end installLatestPackage ${pkgName}`,
      Date.now() - last,
      (last = Date.now()) - start
    );
    console.log(
      new Date(),
      `RETURN getInstallation after installLatestPackage ${pkgName}`,
      Date.now() - last,
      (last = Date.now()) - start
    );
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
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const start = Date.now();
  let last = start;
  // TODO: change epm API to /packageName/version so we don't need to do this
  const [pkgName, pkgVersion] = pkgkey.split('-');

  // see if some version of this package is already installed
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  console.log(new Date(), 'start await Promise.all installationObject, etc');
  const [installedPkg, registryPackageInfo, latestPackage] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchInfo(pkgName, pkgVersion),
    Registry.fetchFindLatestPackage(pkgName),
  ]);
  console.log(new Date(), 'Promise.all installationObject, etc took', (last = Date.now()) - start);

  if (pkgVersion < latestPackage.version)
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

  console.log(
    new Date(),
    'await Promise.all install{Kibana,Pipelines,IndexPatterns}',
    (last = Date.now()) - start
  );
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
  console.log(new Date(), 'await Promise.all took', last - start, (last = Date.now()) - start);
  // install or update the templates
  console.log(
    new Date(),
    'before await installTemplates',
    last - start,
    (last = Date.now()) - start
  );
  const installedTemplates = await installTemplates(
    registryPackageInfo,
    callCluster,
    pkgName,
    pkgVersion
  );
  console.log(new Date(), 'await installTemplates took', last - start, (last = Date.now()) - start);
  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // get template refs to save
  const installedTemplateRefs = installedTemplates.map(template => ({
    id: template.templateName,
    type: IngestAssetType.IndexTemplate,
  }));

  if (installedPkg) {
    // update current index for every index template created
    console.log(
      new Date(),
      'before await updateCurrentWriteIndices',
      last - start,
      (last = Date.now()) - start
    );
    await updateCurrentWriteIndices(callCluster, installedTemplates);
    console.log(
      new Date(),
      'await updateCurrentWriteIndices took',
      last - start,
      (last = Date.now()) - start
    );
    if (!reinstall) {
      try {
        // delete the previous version's installation's pipelines
        // this must happen after the template is updated
        console.log(
          new Date(),
          'before await deleteAssetsByType',
          last - start,
          (last = Date.now()) - start
        );
        await deleteAssetsByType({
          savedObjectsClient,
          callCluster,
          installedObjects: installedPkg.attributes.installed,
          assetType: ElasticsearchAssetType.ingestPipeline,
        });
        console.log(
          new Date(),
          'await deleteAssetsByType took',
          last - start,
          (last = Date.now()) - start
        );
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
  console.log(
    new Date(),
    'return savedInstallationReferences',
    last - start,
    (last = Date.now()) - start
  );
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
