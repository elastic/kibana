/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain, sumBy } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { extractIndexNameFromBackingIndex } from '../../common/utils';

interface IndexStatsResponse {
  docsCountPerDataStream: { [indexName: string]: number };
}

class IndexStatsService {
  public async getIndicesDocCounts(
    esClient: ElasticsearchClient,
    dataStreams: string[]
  ): Promise<IndexStatsResponse> {
    try {
      const index = dataStreams;

      const { indices } = await esClient.indices.stats({ index, metric: ['docs'] });

      const docsCountPerDataStream = chain(indices || {})
        .map((indexStats, indexName) => ({
          indexName,
          totalDocs: indexStats.total?.docs ? indexStats.total?.docs?.count : 0,
        }))
        .groupBy((object) => extractIndexNameFromBackingIndex(object.indexName))
        .mapValues((group) => sumBy(group, 'totalDocs'))
        .value();

      return {
        docsCountPerDataStream,
      };
    } catch (e) {
      if (e.statusCode === 404) {
        return { docsCountPerDataStream: {} };
      }
      throw e;
    }
  }
}

export const indexStatsService = new IndexStatsService();
