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

const sortFieldMap = {
  url: '_key',
  medianTbt: 'medianTbt[50.0]',
  medianDuration: 'medianDuration[50.0]',
  percentage: '_count',
};

export async function getHighTrafficPages({
  setup,
  pageSize,
  pageIndex,
  sorting,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  pageSize: number;
  pageIndex: number;
  afterKey?: string;
  sorting: string;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });

  const sortOptions = JSON.parse(sorting);

  const order: any = {};
  sortOptions.forEach((sortOpt) => {
    const sortField = sortFieldMap[sortOpt.id];
    order[sortField] = sortOpt.direction;
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...projection.body.query.bool.filter],
        },
      },
      aggs: {
        totalPageViews: { value_count: { field: 'transaction.type' } },
        total: {
          cardinality: {
            field: 'url.full',
          },
        },
        urls: {
          terms: {
            field: 'url.full',
            size: 1000,
            ...(sortOptions.length > 0 ? { order } : {}),
          },
          aggs: {
            bucket_truncate: {
              bucket_sort: {
                size: pageSize,
                from: pageIndex * pageSize,
              },
            },
            medianDuration: {
              percentiles: {
                field: 'transaction.duration.us',
                percents: [50],
              },
            },
            medianTbt: {
              percentiles: {
                field: 'transaction.experience.tbt',
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

  const { urls, totalPageViews, total } = response.aggregations!;

  return {
    total: total.value,
    items: urls.buckets.map((bucket) => {
      const urlCount = bucket.doc_count;

      const medianDuration = Number(
        ((bucket.medianDuration.values['50.0'] ?? 0) / 1000000).toFixed(2)
      );

      const medianTbt = Number(
        (bucket.medianTbt.values['50.0'] ?? 0).toFixed(2)
      );

      return {
        url: bucket.key,
        count: urlCount,
        medianDuration,
        medianTbt,
        percentage: Number(
          ((urlCount / totalPageViews.value!) * 100).toFixed(2)
        ),
      };
    }),
  };
}
