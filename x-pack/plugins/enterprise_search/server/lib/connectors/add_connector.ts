/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CURRENT_CONNECTORS_INDEX } from '../..';
import { ConnectorDocument } from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';
import { createConnectorDocument } from '../../utils/create_connector_document';

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { createIndex } from '../indices/create_index';
import { getDefaultPipeline } from '../pipelines/get_default_pipeline';

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
    index: CURRENT_CONNECTORS_INDEX,
    refresh: 'wait_for',
  });
  await createIndex(client, document.index_name, language, false);

  return { id: result._id, index_name: document.index_name };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: {
    delete_existing_connector?: boolean;
    index_name: string;
    is_native: boolean;
    language: string | null;
    service_type?: string;
  }
): Promise<{ id: string; index_name: string }> => {
  const pipeline = await getDefaultPipeline(client);

  const document = createConnectorDocument({
    indexName: input.index_name,
    isNative: input.is_native,
    language: input.language,
    pipeline,
    serviceType: input.service_type ?? null,
  });

  return await createConnector(document, client, input.language, !!input.delete_existing_connector);
};
