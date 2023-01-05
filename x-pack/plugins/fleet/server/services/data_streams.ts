/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';

class DataStreamService {
  public async getAllFleetDataStreams(esClient: ElasticsearchClient) {
    const { data_streams: dataStreamsInfo } = await esClient.indices.getDataStream({
      name: DATA_STREAM_INDEX_PATTERN,
    });

    return dataStreamsInfo;
  }

  public async getAllFleetDataStreamsStats(esClient: ElasticsearchClient) {
    const { data_streams: dataStreamStats } = await esClient.indices.dataStreamsStats({
      name: DATA_STREAM_INDEX_PATTERN,
      human: true,
    });

    return dataStreamStats;
  }
}

export const dataStreamService = new DataStreamService();
