/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TRANSACTION_TYPE } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';
import { SetupUX } from '../../../typings/ui_filters';
import { getEsFilter } from './get_es_filter';
import { rangeQuery } from './range_query';

export function getRumPageLoadTransactionsProjection({
  setup,
  urlQuery,
  checkFetchStartFieldExists = true,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  checkFetchStartFieldExists?: boolean;
  start: number;
  end: number;
}) {
  const { uiFilters } = setup;

  const bool = {
    filter: [
      ...rangeQuery(start, end),
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
                'url.full': `*${urlQuery}*`,
              },
            },
          ]
        : []),
      ...getEsFilter(uiFilters),
    ],
    must_not: [...getEsFilter(uiFilters, true)],
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
