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
import { TRANSACTION_TYPE } from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';

export function getRumOverviewProjection({
  setup,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
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
