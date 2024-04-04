/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsAssetReference } from '../../../../../types';

import { appContextService } from '../../../..';

import { installIlmForDataStream } from '../../../elasticsearch/datastream_ilm/install';
import { installILMPolicy } from '../../../elasticsearch/ilm/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepInstallILMPolicies(context: InstallContext) {
  const { logger, packageInstallContext, esClient, savedObjectsClient, installedPkg } = context;

  // Array that gets updated by each operation. This allows each operation to accurately update the
  // installation object with its references without requiring a refresh of the SO index on each update (faster).
  const esReferences = installedPkg?.attributes.installed_es ?? [];

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
    return { esReferences: res?.esReferences || esReferences };
  }
}
