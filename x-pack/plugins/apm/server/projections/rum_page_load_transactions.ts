/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../server/lib/helpers/setup_request';
import {
  SPAN_TYPE,
  TRANSACTION_TYPE,
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';
import { TRANSACTION_PAGE_LOAD } from '../../common/transaction_types';

export function getRumPageLoadTransactionsProjection({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
      {
        // Adding this filter to cater for some inconsistent rum data
        // not available on aggregated transactions
        exists: {
          field: 'transaction.marks.navigationTiming.fetchStart',
        },
      },
      ...uiFiltersES,
    ],
  };

  return {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      query: {
        bool,
      },
    },
  };
}

export function getRumLongTasksProjection({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [SPAN_TYPE]: 'longtask' } },
      ...uiFiltersES,
    ],
  };

  return {
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      query: {
        bool,
      },
    },
  };
}
