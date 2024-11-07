/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSTALL_STATES } from '../../../../../../common/types';
import { installMlModel } from '../../../elasticsearch/ml_model';
import { deletePrerequisiteAssets, splitESAssets, deleteMLModels } from '../../remove';
import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepInstallMlModel(context: InstallContext) {
  const { logger, packageInstallContext, esClient, savedObjectsClient } = context;

  let esReferences = context.esReferences ?? [];

  esReferences = await withPackageSpan('Install ML models', () =>
    installMlModel(packageInstallContext, esClient, savedObjectsClient, logger, esReferences)
  );
  return { esReferences };
}

export async function cleanUpMlModelStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_ML_MODEL &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;
    const { indexTemplatesAndPipelines, indexAssets, transformAssets } = splitESAssets(installedEs);

    logger.debug('Retry transition - clean up prerequisite ES assets first');
    await withPackageSpan('Retry transition - clean up prerequisite ES assets first', async () => {
      await deletePrerequisiteAssets(
        {
          indexAssets,
          transformAssets,
          indexTemplatesAndPipelines,
        },
        esClient
      );
    });
    logger.debug('Retry transition - clean up ML model');
    await withPackageSpan('Retry transition - clean up ML model', async () => {
      await deleteMLModels(installedEs, esClient);
    });
  }
}
