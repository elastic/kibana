/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery, existsQuery } from '@kbn/observability-plugin/server';
import { DegradedFieldResponse } from '../../../../common/api_types';
import { MAX_DEGRADED_FIELDS } from '../../../../common/constants';
import { createDatasetQualityESClient } from '../../../utils';
import { _IGNORED, TIMESTAMP } from '../../../../common/es_fields';

export async function getDegradedFields({
  esClient,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  dataStream: string;
}): Promise<DegradedFieldResponse> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const filterQuery = [...rangeQuery(start, end)];

  const mustQuery = [...existsQuery(_IGNORED)];

  const aggs = {
    degradedFields: {
      terms: {
        size: MAX_DEGRADED_FIELDS,
        field: _IGNORED,
      },
      aggs: {
        lastOccurrence: {
          max: {
            field: TIMESTAMP,
          },
        },
      },
    },
  };

  const response = await datasetQualityESClient.search({
    index: dataStream,
    size: 0,
    query: {
      bool: {
        filter: filterQuery,
        must: mustQuery,
      },
    },
    aggs,
  });

  return {
    degradedFields:
      response.aggregations?.degradedFields.buckets.map((bucket) => ({
        name: bucket.key as string,
        count: bucket.doc_count,
        lastOccurrence: bucket.lastOccurrence.value,
      })) ?? [],
  };
}
