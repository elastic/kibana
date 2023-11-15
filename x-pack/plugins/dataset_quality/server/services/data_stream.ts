/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesDataStream,
  IndicesDataStreamsStatsDataStreamsStatsItem,
  IndicesIndexTemplate,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

class DataStreamService {
  public streamPartsToIndexPattern({ type, dataset }: { dataset: string; type: string }) {
    return `${type}-${dataset}`;
  }

  public async getMatchingDataStreams(
    esClient: ElasticsearchClient,
    dataStreamParts: {
      dataset: string;
      type: string;
    }
  ): Promise<IndicesDataStream[]> {
    try {
      const { data_streams: dataStreamsInfo } = await esClient.indices.getDataStream({
        name: `${dataStreamParts.type}-${dataStreamParts.dataset}`,
      });

      return dataStreamsInfo;
    } catch (e) {
      if (e.statusCode === 404) {
        return [];
      }
      throw e;
    }
  }

  public async getMatchingDataStreamsStats(
    esClient: ElasticsearchClient,
    dataStreamParts: {
      dataset: string;
      type: string;
    }
  ): Promise<IndicesDataStreamsStatsDataStreamsStatsItem[]> {
    try {
      const { data_streams: dataStreamsStats } = await esClient.indices.dataStreamsStats({
        name: `${dataStreamParts.type}-${dataStreamParts.dataset}`,
        human: true,
      });

      return dataStreamsStats;
    } catch (e) {
      if (e.statusCode === 404) {
        return [];
      }
      throw e;
    }
  }

  public async getMatchingIndexTemplate(
    esClient: ElasticsearchClient,
    dataStreamParts: {
      dataset: string;
      type: string;
    }
  ): Promise<IndicesIndexTemplate | null> {
    try {
      const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate({
        name: `${dataStreamParts.type}-${dataStreamParts.dataset}`,
      });

      return indexTemplates[0]?.index_template;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }
}

export const dataStreamService = new DataStreamService();
