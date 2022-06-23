/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

interface ConnectorDocument {
  index_name: string;
}

export const createConnectorsIndex = async (client: IScopedClusterClient): Promise<void> => {
  const index = CONNECTORS_INDEX;
  await client.asCurrentUser.indices.create({ index });
};

const createConnector = async (
  index: string,
  document: ConnectorDocument,
  client: IScopedClusterClient
): Promise<{ id: string; apiKey: string }> => {
  const result = await client.asCurrentUser.index({
    index,
    document,
  });
  await client.asCurrentUser.indices.create({ index: document.index_name });
  const apiKeyResult = await client.asCurrentUser.security.createApiKey({
    name: `${document.index_name}-connector`,
    role_descriptors: {
      [`${document.index_name}-connector-name`]: {
        cluster: [],
        index: [
          {
            names: [document.index_name, index],
            privileges: ['all'],
          },
        ],
      },
    },
  });
  return { apiKey: apiKeyResult.encoded, id: result._id };
};

export const addConnector = async (
  client: IScopedClusterClient,
  document: ConnectorDocument
): Promise<{ apiKey: string; id: string }> => {
  const index = CONNECTORS_INDEX;
  try {
    return createConnector(index, document, client);
  } catch (error) {
    if (error.statusCode === 404) {
      // This means .ent-search-connectors index doesn't exist yet
      // So we first have to create it, and then try inserting the document again
      // TODO: Move index creation to Kibana startup instead
      await createConnectorsIndex(client);
      return createConnector(index, document, client);
    } else {
      throw error;
    }
  }
};
