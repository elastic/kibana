/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsImporter,
} from 'src/core/server';

import {
  MAX_TIME_COMPLETE_INSTALL,
  ASSETS_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../common';
import type { InstallablePackage, InstallSource, PackageAssetReference } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type { AssetReference, Installation, InstallType } from '../../../types';
import { installTemplates } from '../elasticsearch/template/install';
import {
  installPipelines,
  isTopLevelPipeline,
  deletePreviousPipelines,
} from '../elasticsearch/ingest_pipeline/';
import { getAllTemplateRefs } from '../elasticsearch/template/install';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { installKibanaAssets, getKibanaAssets } from '../kibana/assets/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { installTransform } from '../elasticsearch/transform/install';
import { installMlModel } from '../elasticsearch/ml_model/';
import { installIlmForDataStream } from '../elasticsearch/datastream_ilm/install';
import { saveArchiveEntries } from '../archive/storage';
import { ConcurrentInstallOperationError } from '../../../errors';
import { packagePolicyService } from '../..';

import { createInstallation, saveKibanaAssetsRefs, updateVersion } from './install';
import { deleteKibanaSavedObjectsAssets } from './remove';

// this is only exported for testing
// use a leading underscore to indicate it's not the supported path
// only the more explicit `installPackage*` functions should be used

export async function _installPackage({
  savedObjectsClient,
  savedObjectsImporter,
  esClient,
  logger,
  installedPkg,
  paths,
  packageInfo,
  installType,
  installSource,
  spaceId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: Pick<SavedObjectsImporter, 'import' | 'resolveImportErrors'>;
  esClient: ElasticsearchClient;
  logger: Logger;
  installedPkg?: SavedObject<Installation>;
  paths: string[];
  packageInfo: InstallablePackage;
  installType: InstallType;
  installSource: InstallSource;
  spaceId: string;
}): Promise<AssetReference[]> {
  const { name: pkgName, version: pkgVersion } = packageInfo;

  try {
    // if some installation already exists
    if (installedPkg) {
      // if the installation is currently running, don't try to install
      // instead, only return already installed assets
      if (
        installedPkg.attributes.install_status === 'installing' &&
        Date.now() - Date.parse(installedPkg.attributes.install_started_at) <
          MAX_TIME_COMPLETE_INSTALL
      ) {
        throw new ConcurrentInstallOperationError(
          `Concurrent installation or upgrade of ${pkgName || 'unknown'}-${
            pkgVersion || 'unknown'
          } detected, aborting.`
        );
      } else {
        // if no installation is running, or the installation has been running longer than MAX_TIME_COMPLETE_INSTALL
        // (it might be stuck) update the saved object and proceed
        await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
          install_version: pkgVersion,
          install_status: 'installing',
          install_started_at: new Date().toISOString(),
          install_source: installSource,
        });
      }
    } else {
      await createInstallation({
        savedObjectsClient,
        packageInfo,
        installSource,
        spaceId,
      });
    }

    const kibanaAssets = await getKibanaAssets(paths);
    if (installedPkg) await deleteKibanaSavedObjectsAssets({ savedObjectsClient, installedPkg });
    // save new kibana refs before installing the assets
    const installedKibanaAssetsRefs = await saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      kibanaAssets
    );

    await installKibanaAssets({
      logger,
      savedObjectsImporter,
      pkgName,
      kibanaAssets,
    });

    // the rest of the installation must happen in sequential order
    // currently only the base package has an ILM policy
    // at some point ILM policies can be installed/modified
    // per data stream and we should then save them
    await installILMPolicy(packageInfo, paths, esClient, logger);

    const installedDataStreamIlm = await installIlmForDataStream(
      packageInfo,
      paths,
      esClient,
      savedObjectsClient,
      logger
    );

    // installs ml models
    const installedMlModel = await installMlModel(
      packageInfo,
      paths,
      esClient,
      savedObjectsClient,
      logger
    );

    // installs versionized pipelines without removing currently installed ones
    const installedPipelines = await installPipelines(
      packageInfo,
      paths,
      esClient,
      savedObjectsClient,
      logger
    );
    // install or update the templates referencing the newly installed pipelines
    const installedTemplates = await installTemplates(
      packageInfo,
      esClient,
      logger,
      paths,
      savedObjectsClient
    );

    // update current backing indices of each data stream
    await updateCurrentWriteIndices(esClient, logger, installedTemplates);

    const installedTransforms = await installTransform(
      packageInfo,
      paths,
      esClient,
      savedObjectsClient,
      logger
    );

    // If this is an update or retrying an update, delete the previous version's pipelines
    // Top-level pipeline assets will not be removed on upgrade as of ml model package addition which requires previous
    // assets to remain installed. This is a temporary solution - more robust solution tracked here https://github.com/elastic/kibana/issues/115035
    if (
      paths.filter((path) => isTopLevelPipeline(path)).length === 0 &&
      (installType === 'update' || installType === 'reupdate') &&
      installedPkg
    ) {
      await deletePreviousPipelines(
        esClient,
        savedObjectsClient,
        pkgName,
        installedPkg.attributes.version
      );
    }
    // pipelines from a different version may have installed during a failed update
    if (installType === 'rollback' && installedPkg) {
      await deletePreviousPipelines(
        esClient,
        savedObjectsClient,
        pkgName,
        installedPkg.attributes.install_version
      );
    }
    const installedTemplateRefs = getAllTemplateRefs(installedTemplates);

    const packageAssetResults = await saveArchiveEntries({
      savedObjectsClient,
      paths,
      packageInfo,
      installSource,
    });
    const packageAssetRefs: PackageAssetReference[] = packageAssetResults.saved_objects.map(
      (result) => ({
        id: result.id,
        type: ASSETS_SAVED_OBJECT_TYPE,
      })
    );

    // update to newly installed version when all assets are successfully installed
    if (installedPkg) await updateVersion(savedObjectsClient, pkgName, pkgVersion);

    const updatedPackage = await savedObjectsClient.update<Installation>(
      PACKAGES_SAVED_OBJECT_TYPE,
      pkgName,
      {
        install_version: pkgVersion,
        install_status: 'installed',
        package_assets: packageAssetRefs,
      }
    );

    // If the package is flagged with the `keep_policies_up_to_date` flag, upgrade its
    // associated package policies after installation
    if (updatedPackage.attributes.keep_policies_up_to_date) {
      const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      });

      await packagePolicyService.upgrade(savedObjectsClient, esClient, policyIdsToUpgrade.items);
    }

    return [
      ...installedKibanaAssetsRefs,
      ...installedPipelines,
      ...installedDataStreamIlm,
      ...installedTemplateRefs,
      ...installedTransforms,
      ...installedMlModel,
    ];
  } catch (err) {
    if (savedObjectsClient.errors.isConflictError(err)) {
      throw new ConcurrentInstallOperationError(
        `Concurrent installation or upgrade of ${pkgName || 'unknown'}-${
          pkgVersion || 'unknown'
        } detected, aborting. Original error: ${err.message}`
      );
    } else {
      throw err;
    }
  }
}
