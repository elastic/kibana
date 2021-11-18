/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';
import {
  TRANSACTION_TIME_TO_FIRST_BYTE,
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';

export async function getClientMetrics({
  setup,
  urlQuery,
  percentile = 50,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  percentile?: number;
  start: number;
  end: number;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    checkFetchStartFieldExists: false,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      aggs: {
        hasFetchStartField: {
          filter: {
            exists: { field: 'transaction.marks.navigationTiming.fetchStart' },
          },
          aggs: {
            totalPageLoadDuration: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [percentile],
                hdr: {
                  number_of_significant_value_digits: 3,
                },
              },
            },
            backEnd: {
              percentiles: {
                field: TRANSACTION_TIME_TO_FIRST_BYTE,
                percents: [percentile],
                hdr: {
                  number_of_significant_value_digits: 3,
                },
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;
  const response = await apmEventClient.search('get_client_metrics', params);
  const {
    hasFetchStartField: { backEnd, totalPageLoadDuration },
  } = response.aggregations!;

  const pkey = percentile.toFixed(1);

  const totalPageLoadDurationValue = totalPageLoadDuration.values[pkey] ?? 0;
  const totalPageLoadDurationValueMs = totalPageLoadDurationValue / 1000; // Microseconds to milliseconds
  const backendValue = backEnd.values[pkey] ?? 0;

  return {
    pageViews: { value: response.hits.total.value ?? 0 },
    totalPageLoadDuration: { value: totalPageLoadDurationValueMs },
    backEnd: { value: backendValue },
    frontEnd: { value: totalPageLoadDurationValueMs - backendValue },
  };
}
