/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinates } from '../../../../observability/public/typings/data_handler';
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { rangeFilter } from '../helpers/range_filter';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { ProcessorEvent } from '../../../common/processor_event';

export async function getTransactionDistribution({
  setup,
}: {
  setup: Setup & SetupTimeRange;
}): Promise<Coordinates[]> {
  const { client, indices, start, end } = setup;

  const { aggregations } = await client.search({
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
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

  return (
    aggregations?.distribution.buckets.map((bucket) => ({
      x: bucket.key,
      y: bucket.doc_count,
    })) || []
  );
}
