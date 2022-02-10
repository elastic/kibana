/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSACTION_DURATION } from '../../../common/elasticsearch_fieldnames';
import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';

export const MICRO_TO_SEC = 1000000;

export function microToSec(val: number) {
  return Math.round((val / MICRO_TO_SEC + Number.EPSILON) * 100) / 100;
}

export function removeZeroesFromTail(
  distData: Array<{ x: number; y: number }>
) {
  if (distData.length > 0) {
    while (distData[distData.length - 1].y === 0) {
      distData.pop();
    }
  }
  return distData;
}

export const getPLDChartSteps = ({
  maxDuration,
  minDuration,
  initStepValue,
}: {
  maxDuration: number;
  minDuration: number;
  initStepValue?: number;
}) => {
  let stepValue = 0.5;
  // if diff is too low, let's lower
  // down the steps value to increase steps
  if (maxDuration - minDuration <= 5 * MICRO_TO_SEC) {
    stepValue = 0.1;
  }

  if (initStepValue) {
    stepValue = initStepValue;
  }

  let initValue = minDuration;
  const stepValues = [initValue];

  while (initValue < maxDuration) {
    initValue += stepValue * MICRO_TO_SEC;
    stepValues.push(initValue);
  }

  return stepValues;
};

export async function getPageLoadDistribution({
  setup,
  minPercentile,
  maxPercentile,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  minPercentile?: string;
  maxPercentile?: string;
  urlQuery?: string;
  start: number;
  end: number;
}) {
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  // we will first get 100 steps using 0sec and 50sec duration,
  // most web apps will cover this use case
  // if 99th percentile is greater than 50sec,
  // we will fetch additional 5 steps beyond 99th percentile
  let maxDuration = (maxPercentile ? +maxPercentile : 50) * MICRO_TO_SEC;
  const minDuration = minPercentile ? +minPercentile * MICRO_TO_SEC : 0;
  const stepValues = getPLDChartSteps({
    maxDuration,
    minDuration,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        durPercentiles: {
          percentiles: {
            field: TRANSACTION_DURATION,
            percents: [50, 75, 90, 95, 99],
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
        loadDistribution: {
          percentile_ranks: {
            field: TRANSACTION_DURATION,
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

  const { apmEventClient } = setup;

  const {
    aggregations,
    hits: { total },
  } = await apmEventClient.search('get_page_load_distribution', params);

  if (total.value === 0) {
    return null;
  }

  const { durPercentiles, loadDistribution } = aggregations ?? {};

  let pageDistVals = loadDistribution?.values ?? [];

  const maxPercQuery = durPercentiles?.values['99.0'] ?? 0;

  // we assumed that page load will never exceed 50secs, if 99th percentile is
  // greater then let's fetch additional 10 steps, to cover that on the chart
  if (maxPercQuery > maxDuration && !maxPercentile) {
    const additionalStepsPageVals = await getPercentilesDistribution({
      setup,
      maxDuration: maxPercQuery,
      // we pass 50sec as min to get next steps
      minDuration: maxDuration,
      start,
      end,
    });

    pageDistVals = pageDistVals.concat(additionalStepsPageVals);
    maxDuration = maxPercQuery;
  }

  // calculate the diff to get actual page load on specific duration value
  let pageDist = pageDistVals.map(
    ({ key, value: maybeNullValue }, index: number, arr) => {
      // FIXME: values from percentile* aggs can be null
      const value = maybeNullValue!;
      return {
        x: microToSec(key),
        y: index === 0 ? value : value - arr[index - 1].value!,
      };
    }
  );

  pageDist = removeZeroesFromTail(pageDist);

  Object.entries(durPercentiles?.values ?? {}).forEach(([key, val]) => {
    if (durPercentiles?.values?.[key]) {
      durPercentiles.values[key] = microToSec(val as number);
    }
  });

  return {
    pageLoadDistribution: pageDist,
    percentiles: durPercentiles?.values,
    minDuration: microToSec(minDuration),
    maxDuration: microToSec(maxDuration),
  };
}

const getPercentilesDistribution = async ({
  setup,
  minDuration,
  maxDuration,
  start,
  end,
}: {
  setup: SetupUX;
  minDuration: number;
  maxDuration: number;
  start: number;
  end: number;
}) => {
  const stepValues = getPLDChartSteps({
    minDuration: minDuration + 0.5 * MICRO_TO_SEC,
    maxDuration,
    initStepValue: 0.5,
  });

  const projection = getRumPageLoadTransactionsProjection({
    setup,
    start,
    end,
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
            hdr: {
              number_of_significant_value_digits: 3,
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const { aggregations } = await apmEventClient.search(
    'get_page_load_distribution',
    params
  );

  return aggregations?.loadDistribution.values ?? [];
};
