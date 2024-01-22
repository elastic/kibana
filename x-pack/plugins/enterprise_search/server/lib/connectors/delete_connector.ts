/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { DeleteConnectorResponse } from '../../../common/types/connectors';

export const deleteConnector = async (client: IScopedClusterClient, connectorId: string) => {
  const result = await client.asCurrentUser.transport.request<DeleteConnectorResponse>({
    method: 'DELETE',
    path: `/_connector/${connectorId}`,
  });
  return result;
};
