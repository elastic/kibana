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
import { ErrorCodes } from '../../types/error_codes';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

import { fetchConnectorByIndexName } from './fetch_connectors';

const createConnector = async (
  document: ConnectorDocument,
  client: IScopedClusterClient,
  deleteExisting: boolean
): Promise<{ id: string; index_name: string }> => {
  const index = document.index_name;
  const connector = await fetchConnectorByIndexName(client, index);
  if (connector) {
    if (deleteExisting) {
      // Delete COnnector
    } else {
      throw new Error(ErrorCodes.CONNECTOR_DOCUMENT_ALREADY_EXISTS);
    }
  }
  const indexData = await client.asCurrentUser.indices.get({ index });
  if (indexData[index]) {
    if (deleteExisting) {
      await client.asCurrentUser.indices.delete({ index });
    } else {
      throw new Error(ErrorCodes.INDEX_ALREADY_EXISTS);
    }
  }
  const result = await client.asCurrentUser.index({
    document,
    index: CONNECTORS_INDEX,
  });
  await client.asCurrentUser.indices.create({ index: document.index_name });
  await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });

  return { id: result._id, index_name: document.index_name };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: { index_name: string }
): Promise<{ id: string; index_name: string }> => {
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
    return await createConnector(document, client);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      // This means .ent-search-connectors index doesn't exist yet
      // So we first have to create it, and then try inserting the document again
      await setupConnectorsIndices(client.asCurrentUser);
      return await createConnector(document, client);
    } else {
      throw error;
    }
  }
};
