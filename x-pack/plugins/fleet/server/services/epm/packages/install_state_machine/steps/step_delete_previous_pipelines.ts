/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isTopLevelPipeline,
  deletePreviousPipelines,
} from '../../../elasticsearch/ingest_pipeline';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

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
  } else if (installType === 'rollback' && installedPkg) {
    // pipelines from a different version may have been installed during a failed update
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
  } else {
    // if none of the previous cases, return the original esRefences
    updatedESReferences = esReferences;
  }
  return { esReferences: updatedESReferences };
}
