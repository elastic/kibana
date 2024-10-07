/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

import { CreateIndexRequest, CreateIndexResponse } from '../../common/types';

export async function createIndex(
  client: ElasticsearchClient,
  logger: Logger,
  data: CreateIndexRequest
): Promise<CreateIndexResponse> {
  await client.indices.create({
    index: data.indexName,
  });
  return {
    index: data.indexName,
  };
}
