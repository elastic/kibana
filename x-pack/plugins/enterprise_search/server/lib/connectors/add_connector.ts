/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { Connector } from '../../types/connector';

export const createConnectorsIndex = async (client: IScopedClusterClient): Promise<void> => {
  const index = CONNECTORS_INDEX;
  await client.asCurrentUser.indices.create({ index });
};

const createConnector = async (
  index: string,
  document: Connector,
  client: IScopedClusterClient
): Promise<{ id: string; index_name: string }> => {
  const result = await client.asCurrentUser.index({
    document,
    index,
  });
  await client.asCurrentUser.indices.create({ index: document.index_name });

  return { id: result._id, index_name: document.index_name };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: { index_name: string }
): Promise<{ id: string; index_name: string }> => {
  const index = CONNECTORS_INDEX;
  const document: Connector = {
    api_key_id: null,
    configuration: {},
    created_at: null,
    index_name: input.index_name,
    last_seen: null,
    last_synced: null,
    scheduling: { enabled: false, interval: '* * * * *' },
    service_type: null,
    status: 'not connected',
    sync_error: null,
    sync_now: false,
    sync_status: null,
  };
  try {
    return await createConnector(index, document, client);
  } catch (error) {
    if (error.statusCode === 404) {
      // This means .ent-search-connectors index doesn't exist yet
      // So we first have to create it, and then try inserting the document again
      // TODO: Move index creation to Kibana startup instead
      await createConnectorsIndex(client);
      return await createConnector(index, document, client);
    } else {
      throw error;
    }
  }
};
