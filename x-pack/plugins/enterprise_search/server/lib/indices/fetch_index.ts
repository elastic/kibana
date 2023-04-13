/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_JOBS_INDEX } from '../..';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';
import { SyncStatus } from '../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../common/types/indices';
import { fetchConnectorByIndexName } from '../connectors/fetch_connectors';
import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';

import { mapIndexStats } from './utils/map_index_stats';

const hasInProgressSyncs = async (
  client: IScopedClusterClient,
  connectorId: string
): Promise<boolean> => {
  const inProgressCount = await client.asCurrentUser.count({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      bool: {
        filter: [
          { term: { 'connector.id': connectorId } },
          { term: { status: SyncStatus.IN_PROGRESS } },
        ],
      },
    },
  });
  return inProgressCount.count > 0;
};

export const fetchIndex = async (
  client: IScopedClusterClient,
  index: string
): Promise<ElasticsearchIndexWithIngestion> => {
  const indexDataResult = await client.asCurrentUser.indices.get({ index });
  const indexData = indexDataResult[index];
  const { indices } = await client.asCurrentUser.indices.stats({ index });

  const { count } = await client.asCurrentUser.count({ index });

  if (!indices || !indices[index] || !indexData) {
    throw new Error('404');
  }
  const indexStats = indices[index];

  const connector = await fetchConnectorByIndexName(client, index);
  const hasInProgressSyncsResult = connector
    ? await hasInProgressSyncs(client, connector.id)
    : false;

  const indexResult = {
    count,
    ...mapIndexStats(indexData, indexStats, index),
    has_in_progress_syncs: hasInProgressSyncsResult,
  };

  if (connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
    return {
      ...indexResult,
      connector,
    };
  }

  const crawler = await fetchCrawlerByIndexName(client, index);
  if (crawler) {
    return { ...indexResult, connector, crawler };
  }

  return indexResult;
};
