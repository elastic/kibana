/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamTypes } from '../../../types/default_api_types';
import { DataStreamDetails } from '../../../../common/api_types';
import { dataStreamService } from '../../../services';

export async function getDataStreamDetails(args: {
  esClient: ElasticsearchClient;
  type: DataStreamTypes;
  datasetQuery: string;
}): Promise<DataStreamDetails> {
  const { esClient, type, datasetQuery } = args;

  if (!datasetQuery) {
    throw new Error(`Dataset query cannot be empty. Received value '${datasetQuery}'`);
  }

  const indexSettings = await dataStreamService.getDataSteamIndexSettings(esClient, {
    type,
    dataset: `*${datasetQuery}*`,
  });

  const indexesList = Object.values(indexSettings);
  if (indexesList.length < 1) {
    throw new Error('index_not_found_exception');
  }

  const indexCreationDate = indexesList
    .map((index) => Number(index.settings?.index?.creation_date))
    .sort((a, b) => a - b)[0];

  return {
    createdOn: indexCreationDate,
  };
}
