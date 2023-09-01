/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { createConnector, Connector, deleteConnectorById } from '@kbn/search-connectors';

import { fetchConnectorByIndexName } from '@kbn/search-connectors/lib/fetch_connectors';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { createIndex } from '../indices/create_index';
import { getDefaultPipeline } from '../pipelines/get_default_pipeline';

export const addConnector = async (
  client: IScopedClusterClient,
  input: {
    deleteExistingConnector?: boolean;
    indexName: string | null;
    isNative: boolean;
    language: string | null;
    serviceType?: string | null;
  }
): Promise<Connector> => {
  const index = input.indexName;
  if (index) {
    const indexExists = await client.asCurrentUser.indices.exists({ index });
    if (indexExists) {
      {
        throw new Error(ErrorCode.INDEX_ALREADY_EXISTS);
      }
    }

    const connector = await fetchConnectorByIndexName(client.asCurrentUser, index);
    if (connector) {
      if (input.deleteExistingConnector) {
        await deleteConnectorById(client.asCurrentUser, connector.id);
      } else {
        throw new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS);
      }
    }
    const crawler = await fetchCrawlerByIndexName(client, index);

    if (crawler) {
      throw new Error(ErrorCode.CRAWLER_ALREADY_EXISTS);
    }
    await createIndex(client, index, input.language, false);
  }

  return await createConnector(client.asCurrentUser, {
    ...input,
    pipeline: await getDefaultPipeline(client),
  });
};
