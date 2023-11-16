/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../../services';
import { DataStreamTypes } from '../../../types/data_stream';

export async function getDataStreams(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamTypes;
  datasetQuery?: string;
  sortOrder: 'asc' | 'desc';
  uncategorisedOnly: boolean;
}) {
  const { esClient, type, datasetQuery, uncategorisedOnly, sortOrder } = options;

  const allDataStreams = await dataStreamService.getMatchingDataStreams(esClient, {
    type: type ?? '*',
    dataset: datasetQuery ? `*${datasetQuery}*` : '*',
  });

  const filteredDataStreams = uncategorisedOnly
    ? allDataStreams.filter((stream) => {
        return !stream._meta || !stream._meta.managed_by || stream._meta.managed_by !== 'fleet';
      })
    : allDataStreams;

  const mappedDataStreams = filteredDataStreams.map((dataStream) => ({
    name: dataStream.name,
    ...(dataStream._meta
      ? {
          integration: {
            name: dataStream._meta?.package?.name,
            managed_by: dataStream._meta?.managed_by,
          },
        }
      : {}),
  }));

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
