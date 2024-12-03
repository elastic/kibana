/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { dataStreamService } from '../../../services';

export async function getDataStreamCreatedOn(esClient: ElasticsearchClient, dataStream: string) {
  const indexSettings = await dataStreamService.getDataStreamIndexSettings(esClient, dataStream);

  const indexesList = Object.values(indexSettings);

  return indexesList
    .map((index) => Number(index.settings?.index?.creation_date))
    .sort((a, b) => a - b)[0];
}
