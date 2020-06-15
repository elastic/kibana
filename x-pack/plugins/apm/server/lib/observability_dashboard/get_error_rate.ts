/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';
import { Coordinates } from '../../../../observability/public/typings/data_handler';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { rangeFilter } from '../helpers/range_filter';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { ProcessorEvent } from '../../../common/processor_event';

export async function getErrorRate({
  setup,
  transactionCoordinates,
}: {
  setup: Setup & SetupTimeRange;
  transactionCoordinates: Coordinates[];
}): Promise<Coordinates[]> {
  const { client, indices, start, end } = setup;

  const { aggregations } = await client.search({
    index: indices['apm_oss.errorIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
            { range: rangeFilter(start, end) },
          ],
        },
      },
      aggs: {
        distribution: {
          date_histogram: getMetricsDateHistogramParams(start, end),
        },
      },
    },
  });

  const transactionCountByTimestamp: Record<number, number | undefined> = {};
  transactionCoordinates.forEach(({ x, y }) => {
    transactionCountByTimestamp[x] = y;
  });

  const errorRates = aggregations?.distribution.buckets.map((bucket) => {
    const { key, doc_count: errorCount } = bucket;
    const transactionCount = transactionCountByTimestamp[key] || 1;
    const relativeRate = errorCount / transactionCount;

    return {
      x: key,
      y: transactionCoordinates.length ? relativeRate : undefined,
    };
  });

  return errorRates || [];
}
