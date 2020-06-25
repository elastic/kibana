/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getServiceCount({
  setup,
}: {
  setup: Setup & SetupTimeRange;
}) {
  const { client, indices, start, end } = setup;

  const params = {
    index: [
      indices['apm_oss.transactionIndices'],
      indices['apm_oss.errorIndices'],
      indices['apm_oss.metricsIndices'],
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            {
              terms: {
                [PROCESSOR_EVENT]: [
                  ProcessorEvent.error,
                  ProcessorEvent.transaction,
                  ProcessorEvent.metric,
                ],
              },
            },
          ],
        },
      },
      aggs: { serviceCount: { cardinality: { field: SERVICE_NAME } } },
    },
  };

  const { aggregations } = await client.search(params);
  return aggregations?.serviceCount.value || 0;
}
