/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import assert from 'assert';
import { createEsClient, isServerlessKibanaFlavor } from './stack_services';
import { createSecuritySuperuser } from './security_user_services';

export interface DeleteAllEndpointDataResponse {
  count: number;
  query: string;
  response: estypes.DeleteByQueryResponse;
}

/**
 * Attempts to delete all data associated with the provided endpoint agent IDs.
 *
 * **NOTE:** This utility will create a new role and user that has elevated privileges and access to system indexes.
 *
 * @param esClient
 * @param endpointAgentIds
 */
export const deleteAllEndpointData = async (
  esClient: Client,
  endpointAgentIds: string[]
): Promise<DeleteAllEndpointDataResponse> => {
  assert(endpointAgentIds.length > 0, 'At least one endpoint agent id must be defined');

  const isServerless = await isServerlessKibanaFlavor(esClient);
  const unrestrictedUser = isServerless
    ? { password: 'changeme', username: 'system_indices_superuser', created: false }
    : await createSecuritySuperuser(esClient, 'super_superuser');
  const esUrl = getEsUrlFromClient(esClient);
  const esClientUnrestricted = createEsClient({
    url: esUrl,
    username: unrestrictedUser.username,
    password: unrestrictedUser.password,
  });

  const queryString = endpointAgentIds.map((id) => `(${id})`).join(' OR ');

  const deleteResponse = await esClientUnrestricted.deleteByQuery({
    index: '*,.*',
    body: {
      query: {
        query_string: {
          query: queryString,
        },
      },
    },
    ignore_unavailable: true,
    conflicts: 'proceed',
  });

  return {
    count: deleteResponse.deleted ?? 0,
    query: queryString,
    response: deleteResponse,
  };
};

const getEsUrlFromClient = (esClient: Client) => {
  const connection = esClient.connectionPool.connections.find((entry) => entry.status === 'alive');

  if (!connection) {
    throw new Error(
      'Unable to get esClient connection information. No connection found with status `alive`'
    );
  }

  const url = new URL(connection.url.href);
  url.username = '';
  url.password = '';

  return url.href;
};
