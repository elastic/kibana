/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';

export async function getUrlSearch({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  urlQuery?: string;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        totalUrls: {
          cardinality: {
            field: 'url.full',
          },
        },
        urls: {
          terms: {
            field: 'url.full',
            size: 10,
          },
          aggs: {
            medianPLD: {
              percentiles: {
                field: 'transaction.duration.us',
                percents: [50],
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);
  const { urls, totalUrls } = response.aggregations ?? {};

  return {
    total: totalUrls?.value || 0,
    items: (urls?.buckets ?? []).map((bucket) => ({
      url: bucket.key as string,
      count: bucket.doc_count,
      pld: bucket.medianPLD.values['50.0'] ?? 0,
    })),
  };
}
