/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import {
  TRANSACTION_DURATION,
  TRANSACTION_URL,
} from '../../../common/elasticsearch_fieldnames';

export async function getUrlSearch({
  setup,
  urlQuery,
  percentile,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  percentile: number;
  start: number;
  end: number;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        totalUrls: {
          cardinality: {
            field: TRANSACTION_URL,
          },
        },
        urls: {
          terms: {
            field: TRANSACTION_URL,
            size: 10,
          },
          aggs: {
            medianPLD: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [percentile],
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_url_search', params);
  const { urls, totalUrls } = response.aggregations ?? {};

  const pkey = percentile.toFixed(1);

  return {
    total: totalUrls?.value || 0,
    items: (urls?.buckets ?? []).map((bucket) => ({
      url: bucket.key as string,
      count: bucket.doc_count,
      pld: bucket.medianPLD.values[pkey] ?? 0,
    })),
  };
}
