/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_LANGUAGE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
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
      { terms: { [PROCESSOR_EVENT]: [ProcessorEvent.transaction] } },
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
    body: {
      query: {
        bool,
      },
    },
  };
}

export interface RumErrorsProjection {
  body: {
    query: {
      bool: {
        filter: QueryDslQueryContainer[];
        must_not: QueryDslQueryContainer[];
      };
    };
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
}): RumErrorsProjection {
  return {
    body: {
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            { term: { [AGENT_NAME]: 'rum-js' } },
            {
              term: {
                [SERVICE_LANGUAGE_NAME]: 'javascript',
              },
            },
            {
              terms: {
                [PROCESSOR_EVENT]: [ProcessorEvent.error],
              },
            },
            ...getEsFilter(setup.uiFilters),
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
          must_not: [...getEsFilter(setup.uiFilters, true)],
        },
      },
    },
  };
}
