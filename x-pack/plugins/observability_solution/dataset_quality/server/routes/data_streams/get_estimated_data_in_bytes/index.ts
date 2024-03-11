/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DEFAULT_DATASET_TYPE } from '../../../../common/constants';
import { DataStreamType } from '../../../../common/types';
import { indexStatsService } from '../../../services';

export async function getEstimatedDataInBytes(args: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  start: number;
  end: number;
}) {
  const { esClient, type = DEFAULT_DATASET_TYPE, start, end } = args;

  const [{ doc_count: docCount, size_in_bytes: docSize }, indexDocCountInTimeRange] =
    await Promise.all([
      indexStatsService.getIndexStats(esClient, type),
      indexStatsService.getIndexDocCount(esClient, type, start, end),
    ]);

  if (!docCount) return 0;

  const avgDocSize = docSize / docCount;
  const estimatedDataInBytes = Math.round(indexDocCountInTimeRange * avgDocSize);

  return estimatedDataInBytes;
}
