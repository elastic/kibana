/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { setupConnectorsIndices } from '../../index_management/setup_indices';
import { Connector } from '../../types/connector';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

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
    if (isIndexNotFoundException(error)) {
      // This means .ent-search-connectors index doesn't exist yet
      // So we first have to create it, and then try inserting the document again
      await setupConnectorsIndices(client.asCurrentUser);
      return await createConnector(index, document, client);
    } else {
      throw error;
    }
  }
};
