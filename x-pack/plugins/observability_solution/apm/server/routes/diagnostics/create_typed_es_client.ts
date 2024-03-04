/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';

type RequiredParams = ESSearchRequest & {
  size: number;
  track_total_hits: boolean | number;
};

export type TypedSearch = ReturnType<typeof getTypedSearch>;
export function getTypedSearch(esClient: ElasticsearchClient) {
  async function search<TDocument, TParams extends RequiredParams>(
    opts: TParams
  ): Promise<InferSearchResponseOf<TDocument, TParams>> {
    return esClient.search<TDocument>(opts) as Promise<any>;
  }

  return search;
}
