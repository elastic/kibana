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
import { rangeFilter } from '../../../common/utils/range_filter';
import { Coordinates } from '../../../../observability/public';
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ProcessorEvent } from '../../../common/processor_event';

export async function getTransactionCoordinates({
  setup,
  bucketSize,
}: {
  setup: Setup & SetupTimeRange;
  bucketSize: string;
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
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSize,
            min_doc_count: 0,
          },
        },
      },
    },
  });

  const deltaAsMinutes = (end - start) / 1000 / 60;

  return (
    aggregations?.distribution.buckets.map((bucket) => ({
      x: bucket.key,
      y: bucket.doc_count / deltaAsMinutes,
    })) || []
  );
}
