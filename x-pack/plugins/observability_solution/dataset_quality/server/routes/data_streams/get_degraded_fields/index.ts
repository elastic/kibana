/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery, termQuery, existsQuery } from '@kbn/observability-plugin/server';
import { DataStreamType } from '../../../../common/types';
import { DegradedField } from '../../../../common/api_types';
import { DEFAULT_DATASET_TYPE, MAX_DEGRADED_FIELDS } from '../../../../common/constants';
import { createDatasetQualityESClient } from '../../../utils';
import {
  _IGNORED,
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  DATA_STREAM_TYPE,
  TIMESTAMP,
} from '../../../../common/es_fields';

export async function getDegradedFields({
  esClient,
  start,
  end,
  type = DEFAULT_DATASET_TYPE,
  namespace,
  dataset,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  type?: DataStreamType;
  namespace: string;
  dataset: string;
}): Promise<DegradedField[]> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const filterQuery = [
    ...rangeQuery(start, end),
    ...termQuery(DATA_STREAM_TYPE, type),
    ...termQuery(DATA_STREAM_NAMESPACE, namespace),
    ...termQuery(DATA_STREAM_DATASET, dataset),
  ];

  const mustQuery = [...existsQuery(_IGNORED)];

  const aggs = {
    degradedFields: {
      terms: {
        size: MAX_DEGRADED_FIELDS,
        field: _IGNORED,
      },
      aggs: {
        last_occurrence: {
          max: {
            field: TIMESTAMP,
          },
        },
      },
    },
  };

  const response = await datasetQualityESClient.search({
    size: 0,
    query: {
      bool: {
        filter: filterQuery,
        must: mustQuery,
      },
    },
    aggs,
  });

  return (
    response.aggregations?.degradedFields.buckets.map((bucket) => ({
      fieldName: bucket.key as string,
      count: bucket.doc_count,
      last_occurrence: bucket.last_occurrence.value,
    })) ?? []
  );
}
