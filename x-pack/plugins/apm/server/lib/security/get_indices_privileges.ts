/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'src/core/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { callClientWithDebug } from '../helpers/create_es_client/call_client_with_debug';
import { APMRequestHandlerContext } from '../../routes/typings';

export interface IndexPrivileges {
  has_all_requested: boolean;
  index: Record<string, { read: boolean }>;
}

export async function getIndicesPrivileges({
  request,
  context,
}: {
  request: KibanaRequest;
  context: APMRequestHandlerContext;
}): Promise<IndexPrivileges> {
  // When security plugin is not enabled, returns that the user has all requested privileges.

  const isSecurityPluginEnabled = !!context.plugins.security;

  if (!isSecurityPluginEnabled) {
    return { has_all_requested: true, index: {} };
  }

  const indices = await getApmIndices({
    config: context.config,
    savedObjectsClient: context.core.savedObjects.client,
  });

  return callClientWithDebug({
    apiCaller: context.core.elasticsearch.legacy.client.callAsCurrentUser,
    operationName: 'transport.request',
    params: {
      method: 'POST',
      path: '/_security/user/_has_privileges',
      body: {
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
      },
    },
    request,
    debug: context.params.query._debug,
  }) as Promise<IndexPrivileges>;
}
