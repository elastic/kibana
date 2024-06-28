/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installTransforms } from '../../../elasticsearch/transform/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepInstallTransforms(context: InstallContext) {
  const {
    packageInstallContext,
    esClient,
    savedObjectsClient,
    logger,
    force,
    authorizationHeader,
  } = context;
  let esReferences = context.esReferences ?? [];

  ({ esReferences } = await withPackageSpan('Install transforms', () =>
    installTransforms({
      packageInstallContext,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
      force,
      authorizationHeader,
    })
  ));
  return { esReferences };
}
