/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installMlModel } from '../../../elasticsearch/ml_model';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepInstallMlModel(context: InstallContext) {
  const { logger, esReferences, packageInstallContext, esClient, savedObjectsClient } = context;

  const updatedEsReferences = await withPackageSpan('Install ML models', () =>
    installMlModel(packageInstallContext, esClient, savedObjectsClient, logger, esReferences || [])
  );
  return { esReferences: updatedEsReferences || esReferences };
}
