/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { DataStreamType } from '../../common/types';

class IndexStatsService {
  public async getIndexStats(
    esClient: ElasticsearchClient,
    type: DataStreamType
  ): Promise<{
    doc_count: number;
    size_in_bytes: number;
  }> {
    try {
      const index = `${type}-*-*`;

      const indexStats = await esClient.indices.stats({ index });
      return {
        doc_count: indexStats._all.total?.docs ? indexStats._all.total?.docs?.count : 0,
        size_in_bytes: indexStats._all.total?.store
          ? indexStats._all.total?.store.size_in_bytes
          : 0,
      };
    } catch (e) {
      if (e.statusCode === 404) {
        return { doc_count: 0, size_in_bytes: 0 };
      }
      throw e;
    }
  }

  public async getIndexDocCount(
    esClient: ElasticsearchClient,
    type: DataStreamType,
    start: number,
    end: number
  ): Promise<number> {
    try {
      const index = `${type}-*-*`;

      const query = rangeQuery(start, end)[0];
      const docCount = await esClient.count({
        index,
        query,
      });

      return docCount.count;
    } catch (e) {
      if (e.statusCode === 404) {
        return 0;
      }
      throw e;
    }
  }
}

export const indexStatsService = new IndexStatsService();
