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

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { textAnalysisSettings } from '../indices/text_analysis';

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
  const crawler = await fetchCrawlerByIndexName(client, index);

  if (crawler) {
    throw new Error(ErrorCode.CRAWLER_ALREADY_EXISTS);
  }

  const result = await client.asCurrentUser.index({
    document,
    index: CONNECTORS_INDEX,
  });
  await client.asCurrentUser.indices.create({
    index,
    settings: textAnalysisSettings(language ?? undefined),
  });
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
  const connectorsIndexExists = await client.asCurrentUser.indices.exists({
    index: CONNECTORS_INDEX,
  });
  if (!connectorsIndexExists) {
    await setupConnectorsIndices(client.asCurrentUser);
  }
  return await createConnector(document, client, input.language, !!input.delete_existing_connector);
};
