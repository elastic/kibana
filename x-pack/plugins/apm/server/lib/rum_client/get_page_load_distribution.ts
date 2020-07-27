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

export const MICRO_TO_SEC = 1000000;

export function microToSec(val: number) {
  return Math.round((val / MICRO_TO_SEC + Number.EPSILON) * 100) / 100;
}

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
            hdr: {
              number_of_significant_value_digits: 3,
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

  const { durPercentiles, minDuration } = aggregations ?? {};

  const minPerc = minPercentile
    ? +minPercentile * MICRO_TO_SEC
    : minDuration?.value ?? 0;

  const maxPercQuery = durPercentiles?.values['99.0'] ?? 10000;

  const maxPerc = maxPercentile ? +maxPercentile * MICRO_TO_SEC : maxPercQuery;

  const pageDist = await getPercentilesDistribution(setup, minPerc, maxPerc);

  Object.entries(durPercentiles?.values ?? {}).forEach(([key, val]) => {
    if (durPercentiles?.values?.[key]) {
      durPercentiles.values[key] = microToSec(val as number);
    }
  });

  return {
    pageLoadDistribution: pageDist,
    percentiles: durPercentiles?.values,
    minDuration: microToSec(minPerc),
    maxDuration: microToSec(maxPerc),
  };
}

const getPercentilesDistribution = async (
  setup: Setup & SetupTimeRange & SetupUIFilters,
  minDuration: number,
  maxDuration: number
) => {
  const stepValue = (maxDuration - minDuration) / 100;
  const stepValues = [];
  for (let i = 1; i < 101; i++) {
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
            hdr: {
              number_of_significant_value_digits: 3,
            },
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
      x: microToSec(key),
      y: index === 0 ? value : value - arr[index - 1].value,
    };
  });
};
