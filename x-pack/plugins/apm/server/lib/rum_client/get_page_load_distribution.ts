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
        minDuration: {
          min: {
            field: 'transaction.duration.us',
            missing: 0,
          },
        },
        durPercentiles: {
          percentiles: {
            field: 'transaction.duration.us',
            percents: [50, 75, 90, 95, 99],
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

  const minDuration = aggregations?.minDuration.value ?? 0;

  const minPerc = minPercentile ? +minPercentile : minDuration;

  const maxPercQuery = aggregations?.durPercentiles.values['99.0'] ?? 10000;

  const maxPerc = maxPercentile ? +maxPercentile : maxPercQuery;

  const pageDist = await getPercentilesDistribution(setup, minPerc, maxPerc);
  return {
    pageLoadDistribution: pageDist,
    percentiles: aggregations?.durPercentiles.values,
    minDuration: minPerc,
    maxDuration: maxPerc,
  };
}

const getPercentilesDistribution = async (
  setup: Setup & SetupTimeRange & SetupUIFilters,
  minDuration: number,
  maxDuration: number
) => {
  const stepValue = (maxDuration - minDuration) / 50;
  const stepValues = [];
  for (let i = 1; i < 51; i++) {
    stepValues.push((stepValue * i + minDuration).toFixed(2));
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
          },
        },
      },
    },
  });

  const { client } = setup;

  const { aggregations } = await client.search(params);

  const pageDist = aggregations?.loadDistribution.values ?? [];

  return pageDist.map(({ key, value }, index: number, arr) => {
    return {
      x: Math.round(key / 1000),
      y: index === 0 ? value : value - arr[index - 1].value,
    };
  });
};
