/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { ApiResponse, estypes } from '@elastic/elasticsearch';

export async function bulkDelete(
  esClient: ElasticsearchClient,
  index: string,
  ids: string[]
): Promise<ApiResponse<estypes.BulkResponse, unknown> | undefined> {
  if (ids.length === 0) {
    return;
  }

  return await esClient.bulk({
    body: ids.map((id) => ({
      delete: { _index: index, _id: id },
    })),
  });
}
