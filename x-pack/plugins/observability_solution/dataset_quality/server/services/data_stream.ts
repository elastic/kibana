/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesDataStream,
  IndicesDataStreamsStatsDataStreamsStatsItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { streamPartsToIndexPattern } from '../../common/utils';

class DataStreamService {
  public async getMatchingDataStreams(
    esClient: ElasticsearchClient,
    datasetName: string
  ): Promise<IndicesDataStream[]> {
    try {
      const { data_streams: dataStreamsInfo } = await esClient.indices.getDataStream({
        name: datasetName,
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
        name: streamPartsToIndexPattern({
          typePattern: dataStreamParts.type,
          datasetPattern: dataStreamParts.dataset,
        }),
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

  public async getStreamsStats(
    esClient: ElasticsearchClient,
    dataStreams: string[]
  ): Promise<IndicesDataStreamsStatsDataStreamsStatsItem[]> {
    try {
      const { data_streams: dataStreamsStats } = await esClient.indices.dataStreamsStats({
        name: dataStreams.join(','),
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

  public async getDataSteamIndexSettings(
    esClient: ElasticsearchClient,
    dataStream: string
  ): Promise<Awaited<ReturnType<ElasticsearchClient['indices']['getSettings']>>> {
    try {
      const settings = await esClient.indices.getSettings({
        index: dataStream,
      });

      return settings;
    } catch (e) {
      if (e.statusCode === 404) {
        return {};
      }
      throw e;
    }
  }
}

export const dataStreamService = new DataStreamService();
