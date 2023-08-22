/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CURRENT_CONNECTORS_INDEX } from '../..';
import {
  Connector,
  ConnectorDocument,
  IngestPipelineParams,
} from '../../../common/types/connectors';
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
): Promise<Connector> => {
  const index = document.index_name;
  if (index) {
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
    await createIndex(client, index, language, false);
  }
  const result = await client.asCurrentUser.index({
    document,
    index: CURRENT_CONNECTORS_INDEX,
    refresh: 'wait_for',
  });

  return { ...document, id: result._id };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: {
    deleteExistingConnector?: boolean;
    indexName: string | null;
    isNative: boolean;
    language: string | null;
    pipeline?: IngestPipelineParams | null;
    serviceType?: string | null;
  }
): Promise<Connector> => {
  const pipeline = input.pipeline || (await getDefaultPipeline(client));

  const document = createConnectorDocument({
    ...input,
    pipeline,
    serviceType: input.serviceType || null,
  });

  return await createConnector(document, client, input.language, !!input.deleteExistingConnector);
};
