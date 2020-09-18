/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { BreakdownItem } from '../../../typings/ui_filters';

export async function getPageViewTrends({
  setup,
  breakdowns,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  breakdowns?: string;
  urlQuery?: string;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
  });
  let breakdownItem: BreakdownItem | null = null;
  if (breakdowns) {
    breakdownItem = JSON.parse(breakdowns);
  }

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        pageViews: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 50,
          },
          aggs: breakdownItem
            ? {
                breakdown: {
                  terms: {
                    field: breakdownItem.fieldName,
                    size: 9,
                    missing: 'Other',
                  },
                },
              }
            : undefined,
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  const result = response.aggregations?.pageViews.buckets ?? [];

  return result.map((bucket) => {
    const { key: xVal, doc_count: bCount } = bucket;
    const res: Record<string, null | number> = {
      x: xVal,
      y: bCount,
    };
    if ('breakdown' in bucket) {
      const categoryBuckets = bucket.breakdown.buckets;
      categoryBuckets.forEach(({ key, doc_count: docCount }) => {
        if (key === 'Other') {
          res[key + `(${breakdownItem?.name})`] = docCount;
        } else {
          res[key] = docCount;
        }
      });
    }

    return res;
  });
}
