/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../projections/rum_overview';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

export async function getUrlSearch({
  setup,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  urlQuery?: string;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...projection.body.query.bool.filter],
          must: [
            {
              wildcard: {
                'url.full': {
                  value: `*${urlQuery}*`,
                },
              },
            },
          ],
        },
      },
      aggs: {
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
  const { urls } = response.aggregations!;

  return urls.buckets.map((bucket) => ({
    url: bucket.key as string,
    count: bucket.doc_count,
    pld: (bucket.medianPLD.values['50.0'] ?? 0) / 1000,
  }));
}
