/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME, PROCESSOR_EVENT } from '../elasticsearch_fieldnames';
import { rangeFilter } from '../utils/range_filter';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ApmIndicesConfig } from '../../server/lib/settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../typings/elasticsearch';

export function getServicesProjection({
  start,
  end,
  uiFiltersES,
  indices,
}: {
  start: number;
  end: number;
  uiFiltersES: ESFilter[];
  indices: ApmIndicesConfig;
}) {
  return {
    index: [
      indices['apm_oss.metricsIndices'],
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices'],
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] },
            },
            { range: rangeFilter(start, end) },
            ...uiFiltersES,
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
          },
        },
      },
    },
  };
}
