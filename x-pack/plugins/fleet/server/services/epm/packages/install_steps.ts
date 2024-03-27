/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { ConcurrentInstallOperationError } from '../../../errors';
import {
  MAX_TIME_COMPLETE_INSTALL,
  ASSETS_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  FLEET_INSTALL_FORMAT_VERSION,
} from '../../../constants';
import type { PackageAssetReference, Installation, EsAssetReference } from '../../../types';

import { installKibanaAssetsAndReferences } from '../kibana/assets/install';

import { appContextService, packagePolicyService } from '../..';

import { installIlmForDataStream } from '../elasticsearch/datastream_ilm/install';
import { installILMPolicy } from '../elasticsearch/ilm/install';
import { installMlModel } from '../elasticsearch/ml_model';

import { getNormalizedDataStreams } from '../../../../common/services';

import { removeLegacyTemplates } from '../elasticsearch/template/remove_legacy';

import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { installTransforms } from '../elasticsearch/transform/install';

import { isTopLevelPipeline, deletePreviousPipelines } from '../elasticsearch/ingest_pipeline';

import { auditLoggingService } from '../../audit_logging';

import { saveArchiveEntriesFromAssetsMap } from '../archive/storage';

import { restartInstallation, createInstallation } from './install';
import { withPackageSpan } from './utils';
import type { InstallContext } from './_state_machine_package_install';
import { installIndexTemplatesAndPipelines } from './install_index_template_pipeline';
import { clearLatestFailedAttempts } from './install_errors_helpers';

export async function stepCreateRestartInstallation(context: InstallContext) {
  const {
    savedObjectsClient,
    logger,
    installSource,
    packageInstallContext,
    spaceId,
    force,
    verificationResult,
    installedPkg,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;
  // if some installation already exists
  if (installedPkg) {
    const isStatusInstalling = installedPkg.attributes.install_status === 'installing';
    const hasExceededTimeout =
      Date.now() - Date.parse(installedPkg.attributes.install_started_at) <
      MAX_TIME_COMPLETE_INSTALL;
    logger.debug(`Package install - Install status ${installedPkg.attributes.install_status}`);

    // if the installation is currently running, don't try to install
    // instead, only return already installed assets
    if (isStatusInstalling && hasExceededTimeout) {
      // If this is a forced installation, ignore the timeout and restart the installation anyway
      logger.debug(`Package install - Installation is running and has exceeded timeout`);

      if (force) {
        logger.debug(`Package install - Forced installation, restarting`);
        await restartInstallation({
          savedObjectsClient,
          pkgName,
          pkgVersion,
          installSource,
          verificationResult,
        });
      } else {
        throw new ConcurrentInstallOperationError(
          `Concurrent installation or upgrade of ${pkgName || 'unknown'}-${
            pkgVersion || 'unknown'
          } detected, aborting.`
        );
      }
    } else {
      // if no installation is running, or the installation has been running longer than MAX_TIME_COMPLETE_INSTALL
      // (it might be stuck) update the saved object and proceed
      logger.debug(
        `Package install - no installation running or the installation has been running longer than ${MAX_TIME_COMPLETE_INSTALL}, restarting`
      );
      await restartInstallation({
        savedObjectsClient,
        pkgName,
        pkgVersion,
        installSource,
        verificationResult,
      });
    }
  } else {
    logger.debug(`Package install - Create installation`);
    // step create_installation
    await createInstallation({
      savedObjectsClient,
      packageInfo,
      installSource,
      spaceId,
      verificationResult,
    });
  }
  // Use a shared array that is updated by each operation. This allows each operation to accurately update the
  // installation object with it's references without requiring a refresh of the SO index on each update (faster).
  const esReferences = installedPkg?.attributes.installed_es ?? [];
  return { esReferences };
}

export async function stepInstallKibanaAssets(context: InstallContext) {
  const {
    savedObjectsClient,
    savedObjectsImporter,
    savedObjectTagAssignmentService,
    savedObjectTagClient,
    logger,
    installedPkg,
    packageInstallContext,
    spaceId,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, title: pkgTitle } = packageInfo;

  const kibanaAssetPromise = withPackageSpan('Install Kibana assets', () =>
    installKibanaAssetsAndReferences({
      savedObjectsClient,
      savedObjectsImporter,
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      pkgName,
      pkgTitle,
      packageInstallContext,
      installedPkg,
      logger,
      spaceId,
      assetTags: packageInfo?.asset_tags,
    })
  );
  return { kibanaAssetPromise };
}

export async function stepInstallILMPolicies(context: InstallContext) {
  const { logger, esReferences, packageInstallContext, esClient, savedObjectsClient } = context;
  let updatedEsReferences: EsAssetReference[] = [];

  // currently only the base package has an ILM policy
  // at some point ILM policies can be installed/modified
  // per data stream and we should then save them
  const isILMPoliciesDisabled =
    appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  if (!isILMPoliciesDisabled) {
    updatedEsReferences = await withPackageSpan('Install ILM policies', () =>
      installILMPolicy(
        packageInstallContext,
        esClient,
        savedObjectsClient,
        logger,
        esReferences || []
      )
    );

    const res = await withPackageSpan('Install Data Stream ILM policies', () =>
      installIlmForDataStream(
        packageInstallContext,
        esClient,
        savedObjectsClient,
        logger,
        updatedEsReferences
      )
    );
    return { esReferences: res.esReferences };
  }
}

export async function stepInstallMlModel(context: InstallContext) {
  const { logger, esReferences, packageInstallContext, esClient, savedObjectsClient } = context;

  const updatedEsReferences = await withPackageSpan('Install ML models', () =>
    installMlModel(packageInstallContext, esClient, savedObjectsClient, logger, esReferences || [])
  );
  return { esReferences: updatedEsReferences };
}

export async function stepInstallIndexTemplatePipelines(context: InstallContext) {
  const {
    esClient,
    savedObjectsClient,
    packageInstallContext,
    logger,
    installedPkg,
    esReferences,
  } = context;
  const { packageInfo } = packageInstallContext;

  if (packageInfo.type === 'integration') {
    const { installedTemplates, esReferences: templateEsReferences } =
      await installIndexTemplatesAndPipelines({
        installedPkg: installedPkg ? installedPkg.attributes : undefined,
        packageInstallContext,
        esClient,
        savedObjectsClient,
        logger,
        esReferences: esReferences || [],
      });
    return { esReferences: templateEsReferences, indexTemplates: installedTemplates };
  }

  if (packageInfo.type === 'input' && installedPkg) {
    // input packages create their data streams during package policy creation
    // we must use installed_es to infer which streams exist first then
    // we can install the new index templates
    logger.debug(`Package install - packageInfo.type ${packageInfo.type}`);
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
          packageInstallContext,
          esClient,
          savedObjectsClient,
          logger,
          esReferences: esReferences || [],
          onlyForDataStreams: dataStreams,
        });
      return { esReferences: templateEsReferences, indexTemplates: installedTemplates };
    }
  }
}

export async function stepRemoveLegacyTemplates(context: InstallContext) {
  const { esClient, packageInstallContext, logger } = context;
  const { packageInfo } = packageInstallContext;
  try {
    await removeLegacyTemplates({ packageInfo, esClient, logger });
  } catch (e) {
    logger.warn(`Error removing legacy templates: ${e.message}`);
  }
}

export async function stepUpdateCurrentWriteIndices(context: InstallContext) {
  const { esClient, logger, ignoreMappingUpdateErrors, skipDataStreamRollover, indexTemplates } =
    context;

  // update current backing indices of each data stream
  await withPackageSpan('Update write indices', () =>
    updateCurrentWriteIndices(esClient, logger, indexTemplates || [], {
      ignoreMappingUpdateErrors,
      skipDataStreamRollover,
    })
  );
}

export async function stepInstallTransforms(context: InstallContext) {
  const {
    packageInstallContext,
    esClient,
    savedObjectsClient,
    logger,
    esReferences,
    force,
    authorizationHeader,
  } = context;

  const res = await withPackageSpan('Install transforms', () =>
    installTransforms({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
      force,
      authorizationHeader,
    })
  );

  return { esReferences: res.esReferences };
}

export async function stepDeletePreviousPipelines(context: InstallContext) {
  const {
    packageInstallContext,
    esClient,
    savedObjectsClient,
    logger,
    esReferences,
    installType,
    installedPkg,
  } = context;
  const { packageInfo, paths } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  let updatedESReferences;
  // If this is an update or retrying an update, delete the previous version's pipelines
  // Top-level pipeline assets will not be removed on upgrade as of ml model package addition which requires previous
  // assets to remain installed. This is a temporary solution - more robust solution tracked here https://github.com/elastic/kibana/issues/115035
  if (
    paths.filter((path) => isTopLevelPipeline(path)).length === 0 &&
    (installType === 'update' || installType === 'reupdate') &&
    installedPkg
  ) {
    logger.debug(`Package install - installType ${installType} Deleting previous ingest pipelines`);
    updatedESReferences = await withPackageSpan('Delete previous ingest pipelines', () =>
      deletePreviousPipelines(
        esClient,
        savedObjectsClient,
        pkgName,
        installedPkg!.attributes.version,
        esReferences || []
      )
    );
  }
  // pipelines from a different version may have installed during a failed update
  if (installType === 'rollback' && installedPkg) {
    logger.debug(`Package install - installType ${installType} Deleting previous ingest pipelines`);
    updatedESReferences = await withPackageSpan('Delete previous ingest pipelines', () =>
      deletePreviousPipelines(
        esClient,
        savedObjectsClient,
        pkgName,
        installedPkg!.attributes.install_version,
        esReferences || []
      )
    );
  }
  return { esReferences: updatedESReferences };
}

export async function stepSaveArchiveEntries(context: InstallContext) {
  const { packageInstallContext, savedObjectsClient, installSource, kibanaAssetPromise } = context;
  const installedKibanaAssetsRefs = await kibanaAssetPromise;

  const { packageInfo } = packageInstallContext;

  const packageAssetResults = await withPackageSpan('Update archive entries', () =>
    saveArchiveEntriesFromAssetsMap({
      savedObjectsClient,
      assetsMap: packageInstallContext.assetsMap,
      paths: packageInstallContext.paths,
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

  return { packageAssetRefs, installedKibanaAssetsRefs };
}

export async function stepSaveSystemObject(context: InstallContext) {
  const {
    packageInstallContext,
    savedObjectsClient,
    logger,
    esClient,
    installedPkg,
    packageAssetRefs,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });

  await withPackageSpan('Update install status', () =>
    savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      version: pkgVersion,
      install_version: pkgVersion,
      install_status: 'installed',
      package_assets: packageAssetRefs,
      install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
      latest_install_failed_attempts: clearLatestFailedAttempts(
        pkgVersion,
        installedPkg?.attributes.latest_install_failed_attempts ?? []
      ),
    })
  );

  // Need to refetch the installation again to retrieve all the attributes
  const updatedPackage = await savedObjectsClient.get<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    pkgName
  );
  logger.debug(`Package install - Install status ${updatedPackage?.attributes?.install_status}`);
  // If the package is flagged with the `keep_policies_up_to_date` flag, upgrade its
  // associated package policies after installation
  if (updatedPackage.attributes.keep_policies_up_to_date) {
    await withPackageSpan('Upgrade package policies', async () => {
      const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      });
      logger.debug(
        `Package install - Package is flagged with keep_policies_up_to_date, upgrading its associated package policies ${policyIdsToUpgrade}`
      );
      await packagePolicyService.upgrade(savedObjectsClient, esClient, policyIdsToUpgrade.items);
    });
  }
  logger.debug(
    `Install status ${updatedPackage?.attributes?.install_status} - Installation complete!`
  );
}

// Function invoked after each transition
export const updateLatestExecutedState = async (context: InstallContext) => {
  const { logger, savedObjectsClient, packageInstallContext, latestExecutedState } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });
  try {
    return await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      latest_executed_state: latestExecutedState,
    });
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`failed to update package install state to: latest_executed_state  ${err}`);
    }
  }
};
