/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorDocument, ConnectorStatus } from '../../../common/types/connectors';
import { setupConnectorsIndices } from '../../index_management/setup_indices';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const createConnectorsIndex = async (client: IScopedClusterClient): Promise<void> => {
  const index = CONNECTORS_INDEX;
  await client.asCurrentUser.indices.create({ index });
};

const createConnector = async (
  index: string,
  document: ConnectorDocument,
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
  const document: ConnectorDocument = {
    api_key_id: null,
    configuration: {},
    index_name: input.index_name,
    last_seen: null,
    last_synced: null,
    scheduling: { enabled: false, interval: '* * * * *' },
    service_type: null,
    status: ConnectorStatus.CREATED,
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
