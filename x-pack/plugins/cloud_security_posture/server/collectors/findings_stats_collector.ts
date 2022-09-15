/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../common/constants';

export interface CspmIndicesStats {
  findings: IndexStats;
  latest_findings: IndexStats;
  score: IndexStats;
}

export interface IndexStats {
  doc_count: number;
  latest_doc_timestamp: string;
}

export const getIndicesStats = async (esClient: ElasticsearchClient): Promise<CspmIndicesStats> => {
  return {
    findings: await getIndexStats(esClient, FINDINGS_INDEX_DEFAULT_NS),
    latest_findings: await getIndexStats(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS),
    score: await getIndexStats(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS),
  };
};

export const getIndexStats = async (esClient: ElasticsearchClient, index: string) => {
  return {
    doc_count: await getIndexDocsCount(esClient, index),
    latest_doc_timestamp: await getLatestDocTimestamp(esClient, index),
  };
};

export const getIndexDocsCount = async (esClient: ElasticsearchClient, index: string) => {
  const indexStats = await esClient.indices.stats({
    index,
  });

  return indexStats._all.primaries?.docs ? indexStats._all.primaries?.docs?.count : 0;
};

const getLatestDocTimestamp = async (esClient: ElasticsearchClient, index: string) => {
  const latestTimestamp = await esClient.search({
    index,
    query: {
      match_all: {},
    },
    sort: '@timestamp:desc',
    size: 1,
    fields: ['@timestamp'],
    _source: false,
  });

  const latestEventTimestamp = latestTimestamp.hits?.hits[0]?.fields;

  return latestEventTimestamp ? latestEventTimestamp['@timestamp'][0] : '';
};
