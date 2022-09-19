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
} from '../../../../common/constants';
import type { CspmIndicesStats, IndexStats } from './types';

export const getIndicesStats = async (esClient: ElasticsearchClient): Promise<CspmIndicesStats> => {
  const [findings, latestFindings, score] = await Promise.all([
    getIndexStats(esClient, FINDINGS_INDEX_DEFAULT_NS),
    getIndexStats(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS),
    getIndexStats(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS),
  ]);
  return {
    findings,
    latest_findings: latestFindings,
    score,
  };
};

export const getIndexStats = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<IndexStats | {}> => {
  const isIndexExists = await esClient.indices.exists({
    index,
  });

  if (!isLatestIndexExists) return {};

  const indexStats = await getIndexDocCount(esClient, index);
  return {
    doc_count: indexStats._all.primaries?.docs ? indexStats._all.primaries?.docs?.count : 0,
    deleted: indexStats._all.primaries?.docs?.deleted
      ? indexStats._all.primaries?.docs?.deleted
      : 0,
    size_in_bytes: indexStats._all.primaries?.store
      ? indexStats._all.primaries?.store.size_in_bytes
      : 0,
    latest_doc_timestamp: await getLatestDocTimestamp(esClient, index),
  };
};

export const getIndexDocCount = async (esClient: ElasticsearchClient, index: string) => {
  return await esClient.indices.stats({
    index,
  });
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

  return latestEventTimestamp ? latestEventTimestamp['@timestamp'][0] : null;
};
