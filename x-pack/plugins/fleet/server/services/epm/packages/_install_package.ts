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
  ISavedObjectsImporter,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import { getNormalizedDataStreams } from '../../../../common/services';

import {
  MAX_TIME_COMPLETE_INSTALL,
  ASSETS_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../common/constants';
import { PACKAGES_SAVED_OBJECT_TYPE, FLEET_INSTALL_FORMAT_VERSION } from '../../../constants';
import type {
  AssetReference,
  Installation,
  InstallType,
  InstallablePackage,
  InstallSource,
  PackageAssetReference,
  PackageVerificationResult,
  IndexTemplateEntry,
} from '../../../types';
import { ensureFileUploadWriteIndices } from '../elasticsearch/template/install';
import { removeLegacyTemplates } from '../elasticsearch/template/remove_legacy';
import { isTopLevelPipeline, deletePreviousPipelines } from '../elasticsearch/ingest_pipeline';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { installKibanaAssetsAndReferences } from '../kibana/assets/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { installTransforms } from '../elasticsearch/transform/install';
import { installMlModel } from '../elasticsearch/ml_model';
import { installIlmForDataStream } from '../elasticsearch/datastream_ilm/install';
import { saveArchiveEntries } from '../archive/storage';
import { ConcurrentInstallOperationError } from '../../../errors';
import { appContextService, packagePolicyService } from '../..';

import {
  createInstallation,
  restartInstallation,
  installIndexTemplatesAndPipelines,
} from './install';
import { withPackageSpan } from './utils';

// this is only exported for testing
// use a leading underscore to indicate it's not the supported path
// only the more explicit `installPackage*` functions should be used
export async function _installPackage({
  savedObjectsClient,
  savedObjectsImporter,
  savedObjectTagAssignmentService,
  savedObjectTagClient,
  esClient,
  logger,
  installedPkg,
  paths,
  packageInfo,
  installType,
  installSource,
  spaceId,
  verificationResult,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: Pick<ISavedObjectsImporter, 'import' | 'resolveImportErrors'>;
  savedObjectTagAssignmentService: IAssignmentService;
  savedObjectTagClient: ITagsClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  installedPkg?: SavedObject<Installation>;
  paths: string[];
  packageInfo: InstallablePackage;
  installType: InstallType;
  installSource: InstallSource;
  spaceId: string;
  verificationResult?: PackageVerificationResult;
}): Promise<AssetReference[]> {
  const { name: pkgName, version: pkgVersion, title: pkgTitle } = packageInfo;

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
        await restartInstallation({
          savedObjectsClient,
          pkgName,
          pkgVersion,
          installSource,
          verificationResult,
        });
      }
    } else {
      await createInstallation({
        savedObjectsClient,
        packageInfo,
        installSource,
        spaceId,
        verificationResult,
      });
    }

    const kibanaAssetPromise = withPackageSpan('Install Kibana assets', () =>
      installKibanaAssetsAndReferences({
        savedObjectsClient,
        savedObjectsImporter,
        savedObjectTagAssignmentService,
        savedObjectTagClient,
        pkgName,
        pkgTitle,
        paths,
        installedPkg,
        logger,
        spaceId,
      })
    );
    // Necessary to avoid async promise rejection warning
    // See https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously
    kibanaAssetPromise.catch(() => {});

    // Use a shared array that is updated by each operation. This allows each operation to accurately update the
    // installation object with it's references without requiring a refresh of the SO index on each update (faster).
    let esReferences = installedPkg?.attributes.installed_es ?? [];

    // the rest of the installation must happen in sequential order
    // currently only the base package has an ILM policy
    // at some point ILM policies can be installed/modified
    // per data stream and we should then save them
    esReferences = await withPackageSpan('Install ILM policies', () =>
      installILMPolicy(packageInfo, paths, esClient, savedObjectsClient, logger, esReferences)
    );

    ({ esReferences } = await withPackageSpan('Install Data Stream ILM policies', () =>
      installIlmForDataStream(
        packageInfo,
        paths,
        esClient,
        savedObjectsClient,
        logger,
        esReferences
      )
    ));

    // installs ml models
    esReferences = await withPackageSpan('Install ML models', () =>
      installMlModel(packageInfo, paths, esClient, savedObjectsClient, logger, esReferences)
    );

    let indexTemplates: IndexTemplateEntry[] = [];

    if (packageInfo.type === 'integration') {
      const { installedTemplates, esReferences: templateEsReferences } =
        await installIndexTemplatesAndPipelines({
          installedPkg: installedPkg ? installedPkg.attributes : undefined,
          packageInfo,
          paths,
          esClient,
          savedObjectsClient,
          logger,
          esReferences,
        });
      esReferences = templateEsReferences;
      indexTemplates = installedTemplates;
    }

    if (packageInfo.type === 'input' && installedPkg) {
      // input packages create their data streams during package policy creation
      // we must use installed_es to infer which streams exist first then
      // we can install the new index templates
      const dataStreamNames = installedPkg.attributes.installed_es
        .filter((ref) => ref.type === 'index_template')
        // index templates are named {type}-{dataset}, remove everything before first hyphen
        .map((ref) => ref.id.replace(/^[^-]+-/, ''));

      const dataStreams = dataStreamNames.flatMap((dataStreamName) =>
        getNormalizedDataStreams(packageInfo, dataStreamName)
      );

      if (dataStreams.length) {
        const { installedTemplates, esReferences: templateEsReferences } =
          await installIndexTemplatesAndPipelines({
            installedPkg: installedPkg ? installedPkg.attributes : undefined,
            packageInfo,
            paths,
            esClient,
            savedObjectsClient,
            logger,
            esReferences,
            onlyForDataStreams: dataStreams,
          });
        esReferences = templateEsReferences;
        indexTemplates = installedTemplates;
      }
    }

    try {
      await removeLegacyTemplates({ packageInfo, esClient, logger });
    } catch (e) {
      logger.warn(`Error removing legacy templates: ${e.message}`);
    }

    const { diagnosticFileUploadEnabled } = appContextService.getExperimentalFeatures();
    if (diagnosticFileUploadEnabled) {
      await ensureFileUploadWriteIndices({
        integrationNames: [packageInfo.name],
        esClient,
        logger,
      });
    }

    // update current backing indices of each data stream
    await withPackageSpan('Update write indices', () =>
      updateCurrentWriteIndices(esClient, logger, indexTemplates)
    );

    ({ esReferences } = await withPackageSpan('Install transforms', () =>
      installTransforms(packageInfo, paths, esClient, savedObjectsClient, logger, esReferences)
    ));

    // If this is an update or retrying an update, delete the previous version's pipelines
    // Top-level pipeline assets will not be removed on upgrade as of ml model package addition which requires previous
    // assets to remain installed. This is a temporary solution - more robust solution tracked here https://github.com/elastic/kibana/issues/115035
    if (
      paths.filter((path) => isTopLevelPipeline(path)).length === 0 &&
      (installType === 'update' || installType === 'reupdate') &&
      installedPkg
    ) {
      esReferences = await withPackageSpan('Delete previous ingest pipelines', () =>
        deletePreviousPipelines(
          esClient,
          savedObjectsClient,
          pkgName,
          installedPkg!.attributes.version,
          esReferences
        )
      );
    }
    // pipelines from a different version may have installed during a failed update
    if (installType === 'rollback' && installedPkg) {
      esReferences = await withPackageSpan('Delete previous ingest pipelines', () =>
        deletePreviousPipelines(
          esClient,
          savedObjectsClient,
          pkgName,
          installedPkg!.attributes.install_version,
          esReferences
        )
      );
    }

    const installedKibanaAssetsRefs = await kibanaAssetPromise;
    const packageAssetResults = await withPackageSpan('Update archive entries', () =>
      saveArchiveEntries({
        savedObjectsClient,
        paths,
        packageInfo,
        installSource,
      })
    );
    const packageAssetRefs: PackageAssetReference[] = packageAssetResults.saved_objects.map(
      (result) => ({
        id: result.id,
        type: ASSETS_SAVED_OBJECT_TYPE,
      })
    );

    const updatedPackage = await withPackageSpan('Update install status', () =>
      savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
        version: pkgVersion,
        install_version: pkgVersion,
        install_status: 'installed',
        package_assets: packageAssetRefs,
        install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
      })
    );

    // If the package is flagged with the `keep_policies_up_to_date` flag, upgrade its
    // associated package policies after installation
    if (updatedPackage.attributes.keep_policies_up_to_date) {
      await withPackageSpan('Upgrade package policies', async () => {
        const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
          page: 1,
          perPage: SO_SEARCH_LIMIT,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
        });

        await packagePolicyService.upgrade(savedObjectsClient, esClient, policyIdsToUpgrade.items);
      });
    }

    return [...installedKibanaAssetsRefs, ...esReferences];
  } catch (err) {
    if (SavedObjectsErrorHelpers.isConflictError(err)) {
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
