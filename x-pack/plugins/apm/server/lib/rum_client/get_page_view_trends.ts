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
    const breakdownMap: Map<string, string[]> = new Map(JSON.parse(breakdowns));
    Array.from(breakdownMap.keys()).map((field) => {
      const values = breakdownMap.get(field);
      if (values) {
        values.forEach((value) => {
          breakdownAggs[field + '__' + value] = {
            filter: {
              term: {
                [field]: value,
              },
            },
          };
        });
      }
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
          aggs: {
            transCount: {
              value_count: {
                field: 'transaction.type',
              },
            },
            ...breakdownAggs,
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  const result = response.aggregations?.pageViews.buckets ?? [];
  return result.map((bucket) => {
    const { key: xVal, transCount } = bucket;
    const res: Record<string, null | number> = {
      x: xVal,
      y: transCount.value,
    };
    Object.keys(breakdownAggs).forEach((key) => {
      // @ts-ignore
      res[key] = bucket[key]?.doc_count;
    });

    return res;
  });
}
