/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_PATTERN,
} from '../../common/constants';

interface Usage {
  findings_docs_count: number;
  latest_findings_docs_count: number;
  scores_docs_count: number;
}

export function registerIndicesCounterCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const indicesCounterCollector = usageCollection.makeUsageCollector<Usage>({
    type: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    schema: {
      findings_docs_count: {
        type: 'integer',
        _meta: {
          description: `The total number of documents in the cluster created for ${FINDINGS_INDEX_PATTERN} in the last 24h`,
        },
      },
      latest_findings_docs_count: {
        type: 'integer',
        _meta: {
          description: `The total number of documents in the cluster created for ${LATEST_FINDINGS_INDEX_PATTERN} in the last 24h`,
        },
      },
      scores_docs_count: {
        type: 'integer',
        _meta: {
          description: `The total number of documents in the cluster created for ${BENCHMARK_SCORE_INDEX_PATTERN} in the last 24h`,
        },
      },
    },
    isReady: () => true,

    fetch: async (collectorFetchContext: CollectorFetchContext) =>
      await fetchIndicesCounterMetric(collectorFetchContext.esClient),
  });

  // register usage collector
  usageCollection.registerCollector(indicesCounterCollector);
}

const fetchIndicesCounterMetric = async (esClient: ElasticsearchClient) => {
  const [findingsIndexCount, latestFindingsIndexCount, scoresIndexCount] = await Promise.all([
    getDocsCount(esClient, FINDINGS_INDEX_PATTERN),
    getDocsCount(esClient, LATEST_FINDINGS_INDEX_PATTERN),
    getDocsCount(esClient, BENCHMARK_SCORE_INDEX_PATTERN),
  ]);

  return {
    findings_docs_count: findingsIndexCount,
    latest_findings_docs_count: latestFindingsIndexCount,
    scores_docs_count: scoresIndexCount,
  };
};

const getDocsCount = async (esClient: ElasticsearchClient, index: string): Promise<number> => {
  const response = await esClient.count({
    index,
    body: {
      query: { match_all: {} },
    },
    ignore_unavailable: true,
  });
  return response.count;
};
