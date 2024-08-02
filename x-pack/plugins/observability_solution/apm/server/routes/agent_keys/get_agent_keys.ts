/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApiKey } from '@kbn/security-plugin-types-common';
import { ApmPluginRequestHandlerContext } from '../typings';

export interface AgentKeysResponse {
  agentKeys: ApiKey[];
}

export async function getAgentKeys({
  context,
}: {
  context: ApmPluginRequestHandlerContext;
}): Promise<AgentKeysResponse> {
  const body = {
    size: 1000,
    query: {
      bool: {
        filter: [
          // only retrieve APM keys
          { term: { 'metadata.application': 'apm' } },

          // exclude system keys
          { bool: { must_not: { term: { 'metadata.system': true } } } },
        ],
      },
    },
  };

  const esClient = (await context.core).elasticsearch.client;
  const apiResponse = await esClient.asCurrentUser.transport.request<{
    api_keys: ApiKey[];
  }>({
    method: 'GET',
    path: '_security/_query/api_key',
    body,
  });

  const agentKeys = apiResponse.api_keys.filter(({ invalidated }) => !invalidated);
  return {
    agentKeys,
  };
}
