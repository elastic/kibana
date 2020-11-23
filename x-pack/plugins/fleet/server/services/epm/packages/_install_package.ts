/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import {
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
  PACKAGE_ASSETS_INDEX_NAME,
} from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  AssetReference,
  Installation,
  CallESAsCurrentUser,
  ElasticsearchAssetType,
  InstallType,
} from '../../../types';
import { installIndexPatterns } from '../kibana/index_pattern/install';
import { installTemplates } from '../elasticsearch/template/install';
import { installPipelines, deletePreviousPipelines } from '../elasticsearch/ingest_pipeline/';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { installKibanaAssets, getKibanaAssets } from '../kibana/assets/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { deleteKibanaSavedObjectsAssets } from './remove';
import { installTransform } from '../elasticsearch/transform/install';
import { createInstallation, saveKibanaAssetsRefs, updateVersion } from './install';
import { saveArchiveEntriesToES } from '../archive/save_to_es';

// this is only exported for testing
// use a leading underscore to indicate it's not the supported path
// only the more explicit `installPackage*` functions should be used

export async function _installPackage({
  savedObjectsClient,
  callCluster,
  installedPkg,
  paths,
  packageInfo,
  installType,
  installSource,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  installedPkg?: SavedObject<Installation>;
  paths: string[];
  packageInfo: InstallablePackage;
  installType: InstallType;
  installSource: InstallSource;
}): Promise<AssetReference[]> {
  const { name: pkgName, version: pkgVersion } = packageInfo;
  // add the package installation to the saved object.
  // if some installation already exists, just update install info
  if (installedPkg) {
    await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      install_version: pkgVersion,
      install_status: 'installing',
      install_started_at: new Date().toISOString(),
      install_source: installSource,
    });
  } else {
    await createInstallation({
      savedObjectsClient,
      packageInfo,
      installSource,
    });
  }

  // kick off `installIndexPatterns` & `installKibanaAssets` as early as possible because they're the longest running operations
  // we don't `await` here because we don't want to delay starting the many other `install*` functions
  // however, without an `await` or a `.catch` we haven't defined how to handle a promise rejection
  // we define it many lines and potentially seconds of wall clock time later in
  // `await Promise.all([installKibanaAssetsPromise, installIndexPatternPromise]);`
  // if we encounter an error before we there, we'll have an "unhandled rejection" which causes its own problems
  // the program will log something like this _and exit/crash_
  //   Unhandled Promise rejection detected:
  //   RegistryResponseError or some other error
  //   Terminating process...
  //    server crashed  with status code 1
  //
  // add a `.catch` to prevent the "unhandled rejection" case
  // in that `.catch`, set something that indicates a failure
  // check for that failure later and act accordingly (throw, ignore, return)
  let installIndexPatternError;
  const installIndexPatternPromise = installIndexPatterns(
    savedObjectsClient,
    pkgName,
    pkgVersion,
    installSource
  ).catch((reason) => (installIndexPatternError = reason));
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
  let installKibanaAssetsError;
  const installKibanaAssetsPromise = installKibanaAssets({
    savedObjectsClient,
    pkgName,
    kibanaAssets,
  }).catch((reason) => (installKibanaAssetsError = reason));

  // the rest of the installation must happen in sequential order
  // currently only the base package has an ILM policy
  // at some point ILM policies can be installed/modified
  // per data stream and we should then save them
  await installILMPolicy(paths, callCluster);

  // installs versionized pipelines without removing currently installed ones
  const installedPipelines = await installPipelines(
    packageInfo,
    paths,
    callCluster,
    savedObjectsClient
  );
  // install or update the templates referencing the newly installed pipelines
  const installedTemplates = await installTemplates(
    packageInfo,
    callCluster,
    paths,
    savedObjectsClient
  );

  // update current backing indices of each data stream
  await updateCurrentWriteIndices(callCluster, installedTemplates);

  const installedTransforms = await installTransform(
    packageInfo,
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

  // make sure the assets are installed (or didn't error)
  if (installIndexPatternError) throw installIndexPatternError;
  if (installKibanaAssetsError) throw installKibanaAssetsError;
  await Promise.all([installKibanaAssetsPromise, installIndexPatternPromise]);

  const packageAssetResults = await saveArchiveEntriesToES({
    callCluster,
    paths,
    packageInfo,
    installSource,
  });
  const packageAssetRefs: PackageAssetReference[] = packageAssetResults.items.map((result) => ({
    id: result.index._id,
    type: PACKAGE_ASSETS_INDEX_NAME,
  }));

  // update to newly installed version when all assets are successfully installed
  if (installedPkg) await updateVersion(savedObjectsClient, pkgName, pkgVersion);

  await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    install_version: pkgVersion,
    install_status: 'installed',
    package_assets: packageAssetRefs,
  });

  return [
    ...installedKibanaAssetsRefs,
    ...installedPipelines,
    ...installedTemplateRefs,
    ...installedTransforms,
  ];
}
