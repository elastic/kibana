/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import {
  AGENT_NAME,
  TRANSACTION_TYPE,
  SERVICE_LANGUAGE_NAME,
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';
import { TRANSACTION_PAGE_LOAD } from '../../common/transaction_types';

export function getRumPageLoadTransactionsProjection({
  setup,
  urlQuery,
  checkFetchStartFieldExists = true,
}: {
  setup: Setup & SetupTimeRange;
  urlQuery?: string;
  checkFetchStartFieldExists?: boolean;
}) {
  const { start, end, esFilter } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
      ...(checkFetchStartFieldExists
        ? [
            {
              // Adding this filter to cater for some inconsistent rum data
              // not available on aggregated transactions
              exists: {
                field: 'transaction.marks.navigationTiming.fetchStart',
              },
            },
          ]
        : []),
      ...(urlQuery
        ? [
            {
              wildcard: {
                'url.full': {
                  value: `*${urlQuery}*`,
                },
              },
            },
          ]
        : []),
      ...esFilter,
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

export function getRumErrorsProjection({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange;
  urlQuery?: string;
}) {
  const { start, end, esFilter: esFilter } = setup;

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [AGENT_NAME]: 'rum-js' } },
      {
        term: {
          [SERVICE_LANGUAGE_NAME]: 'javascript',
        },
      },
      ...esFilter,
      ...(urlQuery
        ? [
            {
              wildcard: {
                'url.full': {
                  value: `*${urlQuery}*`,
                },
              },
            },
          ]
        : []),
    ],
  };

  return {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      query: {
        bool,
      },
    },
  };
}
