/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { rangeFilter } from '../helpers/range_filter';

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
      query: { bool: { filter: [{ range: rangeFilter(start, end) }] } },
      aggs: { serviceCount: { cardinality: { field: SERVICE_NAME } } },
    },
  };

  const { aggregations } = await client.search(params);
  return aggregations?.serviceCount.value || 0;
}
