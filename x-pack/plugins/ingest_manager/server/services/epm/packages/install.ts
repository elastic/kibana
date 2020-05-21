/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import Boom from 'boom';
import { apm } from '../../../index';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  KibanaAssetType,
  CallESAsCurrentUser,
  DefaultPackages,
  ElasticsearchAssetType,
  IngestAssetType,
  RegistryPackage,
  RegistrySearchResult,
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
  const span = apm.startSpan('ensureInstalledDefaultPackages');
  // ensure base package is installed first
  const baseInstallation = await ensureInstalledPackage({
    savedObjectsClient,
    pkgName: DefaultPackages.base,
    callCluster,
  });

  // don't include base package in list to install in parallel / any order
  const defaultPackages = Object.keys(DefaultPackages).filter(key => key !== DefaultPackages.base);
  const otherInstallations = await Promise.all(
    defaultPackages.map(pkgName =>
      ensureInstalledPackage({
        savedObjectsClient,
        pkgName,
        callCluster,
      })
    )
  );

  // `ensureInstalledPackage` return Installation | undefined
  // filter out any undefined values
  // we need the `is Installation` guard because of some TS issues
  // https://github.com/microsoft/TypeScript/issues/20707#issuecomment-351874491
  // https://github.com/microsoft/TypeScript/issues/20812
  // https://github.com/microsoft/TypeScript/issues/16069
  //
  // This may be fixed in TS 3.9 (we're on 3.7)
  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#improvements-in-inference-and-promiseall
  const installations = [baseInstallation, ...otherInstallations].filter(notUndefined);

  if (span) span.end();
  return installations;
}

export async function ensureInstalledPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  callCluster: CallESAsCurrentUser;
}): Promise<Installation | undefined> {
  const { savedObjectsClient, pkgName, callCluster } = options;
  const span = apm.startSpan(`ensureInstalledPackage ${pkgName}`);
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
  if (span) span.end();
  return installation;
}

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const apmTrans = apm?.startTransaction(`install package ${pkgkey}`, 'Ingest Manager');
  // TODO: change epm API to /packageName/version so we don't need to do this
  const [pkgName, pkgVersion] = pkgkey.split('-');

  // see if some version of this package is already installed
  // TODO: calls to getInstallationObject, Registry.fetchInfo, and Registry.fetchFindLatestPackge
  // and be replaced by getPackageInfo after adjusting for it to not group/use archive assets
  const pSpan1 = apmTrans?.startSpan(
    `parallel getInstallationObject, Registry.fetchInfo,Registry.fetchFindLatestPackage ${pkgName}`
  );
  // I believe this is also related to Promise.all and addressed in 3.9
  // @ts-ignore
  const [installedPkg, registryPackageInfo, latestPackage]: [
    SavedObject<Installation> | undefined,
    RegistryPackage,
    RegistrySearchResult
  ] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchInfo(pkgName, pkgVersion),
    Registry.fetchFindLatestPackage(pkgName),
  ]);
  if (pSpan1) pSpan1.end();

  if (pkgVersion < latestPackage.version)
    throw Boom.badRequest('Cannot install or update to an out-of-date package');

  // delete the previous version's installation's SO kibana assets before installing new ones
  // in case some assets were removed in the new version
  if (installedPkg) {
    try {
      await deleteKibanaSavedObjectsAssets(savedObjectsClient, installedPkg.attributes.installed);
    } catch (err) {
      // log these errors, some assets may not exist if deleted during a failed update
    }
  }

  const pSpan2 = apmTrans?.startSpan(
    'parallel installKibanaAssets, installPipelines, installIndexPatterns, installILMPolicy'
  );
  const [installedKibanaAssets, installedPipelines, installedTemplates] = await Promise.all([
    installKibanaAssets({
      savedObjectsClient,
      pkgName,
      pkgVersion,
    }),
    installPipelines(registryPackageInfo, callCluster),
    // install or update the templates
    installTemplates(registryPackageInfo, callCluster, pkgName, pkgVersion),
    // index patterns and ilm policies are not currently associated with a particular package
    // so we do not save them in the package saved object state.
    installIndexPatterns(savedObjectsClient, pkgName, pkgVersion),
    // currenly only the base package has an ILM policy
    // at some point ILM policies can be installed/modified
    // per dataset and we should then save them
    installILMPolicy(pkgName, pkgVersion, callCluster),
  ]);
  if (pSpan2) pSpan2.end();

  const toSaveESIndexPatterns = generateESIndexPatterns(registryPackageInfo.datasets);

  // get template refs to save
  const installedTemplateRefs = installedTemplates.map(template => ({
    id: template.templateName,
    type: IngestAssetType.IndexTemplate,
  }));

  if (installedPkg) {
    // update current index for every index template created
    const iSpan = apmTrans?.startSpan(`await updateCurrentWriteIndices ${pkgkey}`);
    await updateCurrentWriteIndices(callCluster, installedTemplates);
    if (iSpan) iSpan.end();
    const reinstall = pkgVersion === installedPkg?.attributes.version;
    if (!reinstall) {
      try {
        // delete the previous version's installation's pipelines
        // this must happen after the template is updated
        const dSpan = apmTrans?.startSpan('delete ingest pipeline');
        await deleteAssetsByType({
          savedObjectsClient,
          callCluster,
          installedObjects: installedPkg.attributes.installed,
          assetType: ElasticsearchAssetType.ingestPipeline,
        });
        if (dSpan) dSpan.end();
      } catch (err) {
        if (iSpan) iSpan.end();
        throw new Error(err.message);
      }
    }
  }

  const toSaveAssetRefs: AssetReference[] = [
    ...installedKibanaAssets,
    ...installedPipelines,
    ...installedTemplateRefs,
  ];
  const { internal = false, removable = true } = registryPackageInfo;
  // Save references to installed assets in the package's saved object state
  const rSpan = apmTrans?.startSpan('saveInstallationReferences');
  const refs = await saveInstallationReferences({
    savedObjectsClient,
    pkgName,
    pkgVersion,
    internal,
    removable,
    toSaveAssetRefs,
    toSaveESIndexPatterns,
  });
  if (rSpan) rSpan.end();
  if (apmTrans) apmTrans.end();
  return refs;
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
  const getInfoSpan = apm.startSpan('installKibanaSavedObjects getArchiveInfo');
  const paths = await Registry.getArchiveInfo(pkgName, pkgVersion, isSameType);
  if (getInfoSpan) getInfoSpan.end();
  const getObjSpan = apm.startSpan('installKibanaSavedObjects getObjects');
  const toBeSavedObjects = await Promise.all(paths.map(getObject));
  if (getObjSpan) getObjSpan.end();

  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const bulkSpan = apm.startSpan('installKibanaSavedObjects bulkCreate');
    const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, {
      overwrite: true,
    });
    const createdObjects = createResults.saved_objects;
    const installed = createdObjects.map(toAssetReference);
    if (bulkSpan) bulkSpan.end();
    return installed;
  }
}

function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaAssetType };

  return reference;
}

function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}
