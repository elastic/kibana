/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SearchHit } from '@kbn/es-types';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { createDatasetQualityESClient } from '../../../utils';
import { TIMESTAMP } from '../../../../common/es_fields';

export async function getFailedDocsErrors({
  esClient,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  dataStream: string;
}): Promise<{ errors: Array<{ type: string; message: string }> }> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const bool = {
    filter: [...rangeQuery(start, end)],
  };

  const response = await datasetQualityESClient.search({
    index: dataStream,
    size: 10000,
    query: {
      bool,
    },
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc',
        },
      },
    ],
    failure_store: 'only',
  });

  const errors = extractAndDeduplicateValues(response.hits.hits);

  return {
    errors,
  };
}

function extractAndDeduplicateValues(
  searchHits: SearchHit[]
): Array<{ type: string; message: string }> {
  const values: Record<string, string[]> = {};

  searchHits.forEach((hit: any) => {
    const fieldKey = hit._source?.error?.type;
    const fieldValue = hit._source?.error?.message;
    if (values[fieldKey]) {
      values[fieldKey].push(fieldValue);
    } else {
      values[fieldKey] = [fieldValue];
    }
  });

  Object.keys(values).forEach((key) => {
    values[key] = Array.from(new Set(values[key]));
  });

  return Object.entries(values)
    .map(([key, messages]) => messages.map((message) => ({ type: key, message })))
    .flat();
}
