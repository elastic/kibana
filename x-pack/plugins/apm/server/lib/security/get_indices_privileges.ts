/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';
import { IndexPrivileges } from '../helpers/es_client';

export async function getIndicesPrivileges({
  setup,
  isSecurityPluginEnabled,
}: {
  setup: Setup;
  isSecurityPluginEnabled: boolean;
}): Promise<IndexPrivileges> {
  // When security plugin is not enabled, returns that the user has all requested privileges.
  if (!isSecurityPluginEnabled) {
    return { has_all_requested: true, index: {} };
  }

  const { client, indices } = setup;
  const response = await client.hasPrivileges({
    index: [
      {
        names: [
          indices['apm_oss.errorIndices'],
          indices['apm_oss.metricsIndices'],
          indices['apm_oss.transactionIndices'],
          indices['apm_oss.spanIndices'],
        ],
        privileges: ['read'],
      },
    ],
  });
  return response;
}
