/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { SetupUX } from '../routes/rum_client/route';
import {
  AGENT_NAME,
  TRANSACTION_TYPE,
  SERVICE_LANGUAGE_NAME,
} from '../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../common/processor_event';
import { TRANSACTION_PAGE_LOAD } from '../../common/transaction_types';
import { getEsFilter } from '../routes/rum_client/ui_filters/get_es_filter';

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

export function getRumErrorsProjection({
  setup,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  start: number;
  end: number;
}) {
  const { uiFilters } = setup;

  const bool = {
    filter: [
      ...rangeQuery(start, end),
      { term: { [AGENT_NAME]: 'rum-js' } },
      {
        term: {
          [SERVICE_LANGUAGE_NAME]: 'javascript',
        },
      },
      ...getEsFilter(uiFilters),
      ...(urlQuery
        ? [
            {
              wildcard: {
                'url.full': `*${urlQuery}*`,
              },
            },
          ]
        : []),
    ],
    must_not: [...getEsFilter(uiFilters, true)],
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
