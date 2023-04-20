/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createEsClient } from './stack_services';
import { createSecuritySuperuser } from './security_user_services';

/**
 * Attempts to delete all data associated with the provided endpoint agent IDs.
 *
 * **NOTE:** This utility will create a new role and user that has elevated privileges and access to system indexes.
 *
 * @param esClient
 * @param endpointAgentIds
 */
const deleteAllEndpointData = async (esClient: Client, endpointAgentIds: string[]) => {
  const unrestrictedUser = await createSecuritySuperuser(esClient, 'super_superuser');
  const esUrl = getEsUrlFromClient(esClient);
  const esClientUnrestricted = createEsClient({
    url: esUrl,
    username: unrestrictedUser.username,
    password: unrestrictedUser.password,
  });

  // FIXME:PT Implement deleteAllEndpointData
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
