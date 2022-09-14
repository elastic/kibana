/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

// export interface FindingsUsage extends FindingsStats {
//   benchmark: string;
//   k8s_object: FindingsStats;
//   process: FindingsStats;
//   file: FindingsStats;
//   load_balancer: FindingsStats;
// }

export interface IndexCounter {
  doc_count: number;
  // index_size: number;
}

export const getFindingsUsage = async (esClient: ElasticsearchClient) => {
  const test = await getIndexStats(esClient);

  // const findingsStats = await getIndexStats(esClient, LATEST_FINDINGS_INDEX_TEMPLATE_NAME);
  // const latestFindingsStats = await getIndexStats(esClient, FINDINGS_INDEX_NAME);
  // const scoreStats = await getIndexStats(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS);

  return {
    total: 5,
    passed: 4,
    failed: 4,
    cluster_id: 'foo',
    benchmark: 'boo',
  };
};

// const getDocsCount = async (esClient: ElasticsearchClient, index: string) => {
const getIndexStats = async (esClient: ElasticsearchClient) => {
  const response = await esClient.search({
    index: 'logs-cloud_security_posture.findings_latest-default',
    body: {},
    // ignore_unavailable: true,
  });
  return response;
};
