/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';

export interface BreakdownItem {
  name: string;
  type: string;
  fieldName: string;
  selected?: boolean;
}

export async function getPageViewTrends({
  setup,
  breakdowns,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  breakdowns?: string;
  urlQuery?: string;
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
                    missing: 'Others',
                  },
                },
              }
            : undefined,
        },
        ...(breakdownItem
          ? {
              topBreakdowns: {
                terms: {
                  field: breakdownItem.fieldName,
                  size: 9,
                },
              },
            }
          : {}),
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_page_view_trends', params);

  const { topBreakdowns } = response.aggregations ?? {};

  // we are only displaying top 9
  const topItems: string[] = (topBreakdowns?.buckets ?? []).map(
    ({ key }) => key as string
  );

  const result = response.aggregations?.pageViews.buckets ?? [];

  return {
    topItems,
    items: result.map((bucket) => {
      const { key: xVal, doc_count: bCount } = bucket;
      const res: Record<string, number> = {
        x: xVal,
        y: bCount,
      };
      if ('breakdown' in bucket) {
        let top9Count = 0;
        const categoryBuckets = bucket.breakdown.buckets;
        categoryBuckets.forEach(({ key, doc_count: docCount }) => {
          if (topItems.includes(key as string)) {
            if (res[key]) {
              // if term is already in object, just add it to it
              res[key] += docCount;
            } else {
              res[key] = docCount;
            }
            top9Count += docCount;
          }
        });
        // Top 9 plus others, get a diff from parent bucket total
        if (bCount > top9Count) {
          res.Others = bCount - top9Count;
        }
      }

      return res;
    }),
  };
}
