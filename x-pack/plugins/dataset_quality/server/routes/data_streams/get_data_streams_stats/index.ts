/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../../services';
import { DataStreamTypes } from '../../../types/data_stream';

export async function getDataStreamsStats(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamTypes;
  datasetQuery?: string;
  sortOrder: 'asc' | 'desc';
}) {
  const { esClient, type, datasetQuery, sortOrder } = options;

  const matchingDataStreamsStats = await dataStreamService.getMatchingDataStreamsStats(esClient, {
    type: type ?? '*',
    dataset: datasetQuery ? `*${datasetQuery}*` : '*',
  });

  const mappedDataStreams = matchingDataStreamsStats.map((dataStream) => {
    return {
      name: dataStream.data_stream,
      size: dataStream.store_size,
      size_bytes: dataStream.store_size_bytes,
      last_activity: dataStream.maximum_timestamp,
    };
  });

  const sortedDataStreams = mappedDataStreams.sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.name.localeCompare(a.name);
    }

    return a.name.localeCompare(b.name);
  });

  return {
    items: sortedDataStreams,
  };
}
