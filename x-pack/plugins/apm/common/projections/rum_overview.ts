/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/helpers/setup_request';
import { PROCESSOR_EVENT, TRANSACTION_TYPE } from '../elasticsearch_fieldnames';
import { rangeFilter } from '../utils/range_filter';

export function getRumOverviewProjection({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [PROCESSOR_EVENT]: 'transaction' } },
      { term: { [TRANSACTION_TYPE]: 'page-load' } },
      {
        // Adding this filter to cater for some inconsistent rum data
        exists: {
          field: 'transaction.marks.navigationTiming.fetchStart',
        },
      },
      ...uiFiltersES,
    ],
  };

  return {
    index: indices['apm_oss.transactionIndices'],
    body: {
      query: {
        bool,
      },
    },
  };
}
