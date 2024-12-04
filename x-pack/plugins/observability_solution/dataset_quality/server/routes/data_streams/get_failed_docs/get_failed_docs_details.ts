/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { TIMESTAMP } from '../../../../common/es_fields';
import { FailedDocsDetails } from '../../../../common/api_types';
import { getFieldIntervalInSeconds } from '../../../utils/get_interval';
import { createDatasetQualityESClient } from '../../../utils';

export async function getFailedDocsDetails({
  esClient,
  start,
  end,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  dataStream: string;
}): Promise<FailedDocsDetails> {
  const fieldInterval = getFieldIntervalInSeconds({ start, end });
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const filterQuery = [...rangeQuery(start, end)];

  const aggs = {
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
  };

  const response = await datasetQualityESClient.search({
    index: dataStream,
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: filterQuery,
      },
    },
    aggs,
    failure_store: 'only',
  });

  return {
    count: response.hits.total.value,
    lastOccurrence: response.aggregations?.lastOccurrence.value,
    timeSeries:
      response.aggregations?.timeSeries.buckets.map((timeSeriesBucket) => ({
        x: timeSeriesBucket.key,
        y: timeSeriesBucket.doc_count,
      })) ?? [],
  };
}
