/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorDocument, ConnectorStatus } from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';
import { setupConnectorsIndices } from '../../index_management/setup_indices';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

import { deleteConnectorById } from './delete_connector';

import { fetchConnectorByIndexName } from './fetch_connectors';

const createConnector = async (
  document: ConnectorDocument,
  client: IScopedClusterClient,
  language: string | null,
  deleteExisting: boolean
): Promise<{ id: string; index_name: string }> => {
  const index = document.index_name;
  const indexExists = await client.asCurrentUser.indices.exists({ index });
  if (indexExists) {
    {
      throw new Error(ErrorCode.INDEX_ALREADY_EXISTS);
    }
  }

  const connector = await fetchConnectorByIndexName(client, index);
  if (connector) {
    if (deleteExisting) {
      await deleteConnectorById(client, connector.id);
    } else {
      throw new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS);
    }
  }
  const result = await client.asCurrentUser.index({
    document,
    index: CONNECTORS_INDEX,
  });
  await client.asCurrentUser.indices.create({ index });
  await client.asCurrentUser.indices.refresh({ index: CONNECTORS_INDEX });

  return { id: result._id, index_name: document.index_name };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: { delete_existing_connector?: boolean; index_name: string; language: string | null }
): Promise<{ id: string; index_name: string }> => {
  const document: ConnectorDocument = {
    api_key_id: null,
    configuration: {},
    index_name: input.index_name,
    language: input.language,
    last_seen: null,
    last_sync_error: null,
    last_sync_status: null,
    last_synced: null,
    name: input.index_name.startsWith('search-') ? input.index_name.substring(7) : input.index_name,
    scheduling: { enabled: false, interval: '0 0 0 * * ?' },
    service_type: null,
    status: ConnectorStatus.CREATED,
    sync_now: false,
  };
  try {
    return await createConnector(
      document,
      client,
      input.language,
      !!input.delete_existing_connector
    );
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      // This means .ent-search-connectors index doesn't exist yet
      // So we first have to create it, and then try inserting the document again
      await setupConnectorsIndices(client.asCurrentUser);
      return await createConnector(document, client, input.language, false);
    } else {
      throw error;
    }
  }
};
