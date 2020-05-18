/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupUIFilters,
  SetupTimeRange,
  SetupHasTransactionDurationMetrics
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME } from '../elasticsearch_fieldnames';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getServicesProjection({
  setup
}: {
  setup: Setup &
    SetupTimeRange &
    SetupUIFilters &
    SetupHasTransactionDurationMetrics;
}) {
  const {
    start,
    end,
    uiFiltersES,
    indices,
    hasTransactionDurationMetrics
  } = setup;

  const index = [
    indices['apm_oss.metricsIndices'],
    indices['apm_oss.errorIndices']
  ];

  if (!hasTransactionDurationMetrics) {
    index.push(indices['apm_oss.transactionIndices']);
  }

  return {
    index,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ range: rangeFilter(start, end) }, ...uiFiltersES]
        }
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME
          }
        }
      }
    }
  };
}
