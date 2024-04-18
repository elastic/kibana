/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamType } from '../../../../common/types';
import { dataStreamService } from '../../../services';

export async function getDataStreams(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  datasetQuery?: string;
  uncategorisedOnly: boolean;
}) {
  const { esClient, type, datasetQuery, uncategorisedOnly } = options;

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
    integration: dataStream._meta?.package?.name,
  }));

  return {
    items: mappedDataStreams,
  };
}
