/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import get from 'lodash/get';

export const findExistingIndices = async (
  indices: string[],
  esClient: ElasticsearchClient,
  signalIndexName?: string
): Promise<boolean[]> =>
  Promise.all(
    indices
      .map(async (index) => {
        if (signalIndexName === index) {
          return true;
        }
        const searchResponse = await esClient.search({
          index,
          body: { query: { match_all: {} }, size: 0 },
        });
        return get(searchResponse, 'body.hits.total.value', 0) > 0;
      })
      .map((p) => p.catch((e) => false))
  );
