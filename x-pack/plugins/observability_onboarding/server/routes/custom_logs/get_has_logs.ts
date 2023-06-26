/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export async function getHasLogs({
  dataset,
  namespace,
  esClient,
}: {
  dataset: string;
  namespace: string;
  esClient: ElasticsearchClient;
}) {
  try {
    const { hits } = await esClient.search({
      index: `logs-${dataset}-${namespace}`,
      terminate_after: 1,
    });
    const total = hits.total as { value: number };
    return total.value > 0;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}
