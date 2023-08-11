/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';


import {
  Connector,
} from '../../../common/types/connectors';

import { CONNECTORS_INDEX } from '../..'

export const postCrawlerCustomScheduling = async (
  client: IScopedClusterClient,
  indexName: string,
  customSchedules: Object,
): Promise<Connector | undefined> => {

  console.log('Inside postCrawlerCustomScheduling')
  console.log(customSchedules)

  const connectorId = await fetchCrawlerDocumentIdByIndexName(client, indexName)
  const crawlerResult = await client.asCurrentUser.update<Connector>({
    index: CONNECTORS_INDEX,
    id: connectorId,
    doc: {
      custom_scheduling: Object.fromEntries(customSchedules)
    }
  });
  console.log(crawlerResult)
  return crawlerResult;
};

export const fetchCrawlerDocumentIdByIndexName = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<string> => {

  const crawlerResult = await client.asCurrentUser.search<Connector>({
    index: CONNECTORS_INDEX,
    query: { term: { index_name: indexName } },
    _source: '_id',
  });
  const crawlerId = crawlerResult.hits.hits[0]?._id;
  return crawlerId;
};
