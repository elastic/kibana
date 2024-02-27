/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamType } from '../../../../common/types';
import { dataStreamService } from '../../../services';

export async function getDataStreamsStats(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  datasetQuery?: string;
}) {
  const { esClient, type, datasetQuery } = options;

  const matchingDataStreamsStats = await dataStreamService.getMatchingDataStreamsStats(esClient, {
    type: type ?? '*',
    dataset: datasetQuery ? `*${datasetQuery}*` : '*',
  });

  const mappedDataStreams = matchingDataStreamsStats.map((dataStream) => {
    return {
      name: dataStream.data_stream,
      size: dataStream.store_size?.toString(),
      sizeBytes: dataStream.store_size_bytes,
      lastActivity: dataStream.maximum_timestamp,
    };
  });

  return {
    items: mappedDataStreams,
  };
}
