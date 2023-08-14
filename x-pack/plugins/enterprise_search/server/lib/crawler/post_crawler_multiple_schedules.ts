/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { Connector } from '../../../common/types/connectors';

import {fetchCrawlerDocumentIdByIndexName} from './fetch_crawlers';

export const postCrawlerCustomScheduling = async (
  client: IScopedClusterClient,
  indexName: string,
  customSchedules: Object
): Promise<Connector | undefined> => {
  const connectorId = await fetchCrawlerDocumentIdByIndexName(client, indexName);
  const crawlerResult = await client.asCurrentUser.update<Connector>({
    index: CONNECTORS_INDEX,
    id: connectorId,
    doc: {
      custom_scheduling: Object.fromEntries(customSchedules),
    },
  });
  return crawlerResult;
};
