/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TRANSACTION_DURATION } from '../../../common/elasticsearch_fieldnames';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
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
  const projection = getRumPageLoadTransactionsProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        minDuration: {
          min: {
            field: TRANSACTION_DURATION,
            missing: 0,
          },
        },
        durPercentiles: {
          percentiles: {
            field: TRANSACTION_DURATION,
            percents: [50, 75, 90, 95, 99],
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const {
    aggregations,
    hits: { total },
  } = await apmEventClient.search(params);

  if (total.value === 0) {
    return null;
  }

  const minDuration = aggregations?.minDuration.value ?? 0;

  const minPerc = minPercentile ? +minPercentile : minDuration;

  const maxPercQuery = aggregations?.durPercentiles.values['99.0'] ?? 10000;

  const maxPerc = maxPercentile ? +maxPercentile : maxPercQuery;

  const pageDist = await getPercentilesDistribution({
    setup,
    minDuration: minPerc,
    maxDuration: maxPerc,
  });

  return {
    pageLoadDistribution: pageDist,
    percentiles: aggregations?.durPercentiles.values,
    minDuration: minPerc,
    maxDuration: maxPerc,
  };
}

const getPercentilesDistribution = async ({
  setup,
  minDuration,
  maxDuration,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  minDuration: number;
  maxDuration: number;
}) => {
  const stepValue = (maxDuration - minDuration) / 50;
  const stepValues = [];
  for (let i = 1; i < 51; i++) {
    stepValues.push((stepValue * i + minDuration).toFixed(2));
  }

  const projection = getRumPageLoadTransactionsProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        loadDistribution: {
          percentile_ranks: {
            field: TRANSACTION_DURATION,
            values: stepValues,
            keyed: false,
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const { aggregations } = await apmEventClient.search(params);

  const pageDist = aggregations?.loadDistribution.values ?? [];

  return pageDist.map(({ key, value }, index: number, arr) => {
    return {
      x: Math.round(key / 1000),
      y: index === 0 ? value : value - arr[index - 1].value,
    };
  });
};
