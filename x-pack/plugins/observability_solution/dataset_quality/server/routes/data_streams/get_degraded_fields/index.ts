/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery, existsQuery } from '@kbn/observability-plugin/server';
import { inspect } from 'util';
import { getIgnoredMetadata } from '../get_ignored_metadata';
import { DegradedFieldResponse } from '../../../../common/api_types';
import { MAX_DEGRADED_FIELDS } from '../../../../common/constants';
import { createDatasetQualityESClient } from '../../../utils';
import { _IGNORED, TIMESTAMP } from '../../../../common/es_fields';
import { getFieldIntervalInSeconds } from './get_interval';

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
  const fieldInterval = getFieldIntervalInSeconds({ start, end });
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
        timeSeries: {
          date_histogram: {
            field: TIMESTAMP,
            fixed_interval: `${fieldInterval}s`,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
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

  // TODO: Achyut will remove this block of code once we have a UI which can call the API.
  if (response.aggregations?.degradedFields.buckets[0].key) {
    const apiData = await getIgnoredMetadata({
      esClient,
      dataStream,
      field: response.aggregations.degradedFields.buckets[0].key as string,
    });

    console.log('API_Data', inspect(apiData, { showHidden: false, depth: null }));
  }

  return {
    degradedFields:
      response.aggregations?.degradedFields.buckets.map((bucket) => ({
        name: bucket.key as string,
        count: bucket.doc_count,
        lastOccurrence: bucket.lastOccurrence.value,
        timeSeries: bucket.timeSeries.buckets.map((timeSeriesBucket) => ({
          x: timeSeriesBucket.key,
          y: timeSeriesBucket.doc_count,
        })),
      })) ?? [],
  };
}
