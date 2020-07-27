/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupUIFilters,
  SetupTimeRange,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME, PROCESSOR_EVENT } from '../elasticsearch_fieldnames';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { rangeFilter } from '../utils/range_filter';

export function getServicesProjection({
  setup,
  noEvents,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  noEvents?: boolean;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  return {
    ...(noEvents
      ? {}
      : {
          index: [
            indices['apm_oss.metricsIndices'],
            indices['apm_oss.errorIndices'],
            indices['apm_oss.transactionIndices'],
          ],
        }),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...(noEvents
              ? []
              : [
                  {
                    terms: {
                      [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'],
                    },
                  },
                ]),
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
