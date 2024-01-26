/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import { getRequestBody } from '../helpers/get_available_indices';

type AggregateName = 'index';
interface Result {
  index: {
    buckets: Array<{ key: string }>;
    doc_count: number;
  };
}

export const fetchAvailableIndices = (
  esClient: ElasticsearchClient,
  params: { indexPattern: string; startDate: string; endDate: string }
) => esClient.search<AggregateName, Result>(getRequestBody(params));
