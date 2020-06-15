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

export async function getPageLoadDistribution({
  setup,
  minPercentile,
  maxPercentile,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  minPercentile?: string;
  maxPercentile?: string;
}) {
  const projection = getRumOverviewProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        durationMinMax: {
          min: {
            field: 'transaction.duration.us',
            missing: 0,
          },
        },
        durationPercentiles: {
          percentiles: {
            field: 'transaction.duration.us',
            percents: [50, 75, 90, 95, 99],
            script: {
              lang: 'painless',
              source: "doc['transaction.duration.us'].value / params.timeUnit",
              params: {
                timeUnit: 1000,
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const {
    aggregations,
    hits: { total },
  } = await client.search(params);

  if (total.value === 0) {
    return null;
  }

  const minDuration = (aggregations?.durationMinMax.value ?? 0) / 1000;

  const minPerc = minPercentile ? +minPercentile : minDuration;

  const maxPercentileQuery =
    aggregations?.durationPercentiles.values['99.0'] ?? 100;

  const maxPerc = maxPercentile ? +maxPercentile : maxPercentileQuery;

  const pageDist = await getPercentilesDistribution(setup, minPerc, maxPerc);
  return {
    pageLoadDistribution: pageDist,
    percentiles: aggregations?.durationPercentiles.values,
  };
}

const getPercentilesDistribution = async (
  setup: Setup & SetupTimeRange & SetupUIFilters,
  minPercentiles: number,
  maxPercentile: number
) => {
  const stepValue = (maxPercentile - minPercentiles) / 50;
  const stepValues = [];
  for (let i = 1; i < 50; i++) {
    stepValues.push((stepValue * i + minPercentiles).toFixed(2));
  }

  const projection = getRumOverviewProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        loadDistribution: {
          percentile_ranks: {
            field: 'transaction.duration.us',
            values: stepValues,
            keyed: false,
            script: {
              lang: 'painless',
              source: "doc['transaction.duration.us'].value / params.timeUnit",
              params: {
                timeUnit: 1000,
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const { aggregations } = await client.search(params);

  const pageDist = (aggregations?.loadDistribution.values ?? []) as Array<{
    key: number;
    value: number;
  }>;

  return pageDist.map(({ key, value }, index: number, arr) => {
    return {
      x: key,
      y: index === 0 ? value : value - arr[index - 1].value,
    };
  });
};
