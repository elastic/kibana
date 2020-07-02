/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../../common/projections/rum_overview';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { AggregationInputMap } from '../../../typings/elasticsearch/aggregations';
import { BreakdownItem } from '../../../typings/ui_filters';

export async function getPageViewTrends({
  setup,
  breakdowns,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  breakdowns?: string;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });
  const breakdownAggs: AggregationInputMap = {};
  if (breakdowns) {
    const breakdownList: BreakdownItem[] = JSON.parse(breakdowns);
    breakdownList.forEach(({ name, type, fieldName }) => {
      breakdownAggs[name] = {
        terms: {
          field: fieldName,
          size: 9,
          missing: 'Other',
        },
      };
    });
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
          aggs: breakdownAggs,
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  const result = response.aggregations?.pageViews.buckets ?? [];

  return result.map((bucket) => {
    const { key: xVal, doc_count: bCount } = bucket;
    const res: Record<string, null | number> = {
      x: xVal,
      y: bCount,
    };

    Object.keys(breakdownAggs).forEach((bKey) => {
      const categoryBuckets = (bucket[bKey] as any).buckets;
      categoryBuckets.forEach(
        ({ key, doc_count: docCount }: { key: string; doc_count: number }) => {
          if (key === 'Other') {
            res[key + `(${bKey})`] = docCount;
          } else {
            res[key] = docCount;
          }
        }
      );
    });

    return res;
  });
}
