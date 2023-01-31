/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

export const fetchMappings = async (
  client: ElasticsearchClient,
  indexPatterns: string[]
): Promise<Record<string, IndicesGetMappingIndexMappingRecord>> =>
  client.indices.getMapping({
    expand_wildcards: ['open'],
    index: indexPatterns,
  });
