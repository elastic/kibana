/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { ProcessorEvent } from '../../../common/processor_event';
import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';

export const getBreakdownField = (breakdown: string) => {
  switch (breakdown) {
    case 'Location':
      return CLIENT_GEO_COUNTRY_ISO_CODE;
    case 'Device':
      return USER_AGENT_DEVICE;
    case 'OS':
      return USER_AGENT_OS;
    case 'Browser':
    default:
      return USER_AGENT_NAME;
  }
};
export function microToSec(val: number) {
  return Math.round((val / MICRO_TO_SEC + Number.EPSILON) * 100) / 100;
}

export const MICRO_TO_SEC = 1000000;
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
export const getPageLoadDistBreakdown = async ({
  setup,
  minPercentile,
  maxPercentile,
  breakdown,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  minPercentile: number;
  maxPercentile: number;
  breakdown: string;
  urlQuery?: string;
  start: number;
  end: number;
}) => {
  // convert secs to micros
  const stepValues = getPLDChartSteps({
    maxDuration: (maxPercentile ? +maxPercentile : 50) * MICRO_TO_SEC,
    minDuration: minPercentile ? +minPercentile * MICRO_TO_SEC : 0,
  });

  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  const params = mergeProjection(projection, {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 0,
      aggs: {
        breakdowns: {
          terms: {
            field: getBreakdownField(breakdown),
            size: 9,
          },
          aggs: {
            page_dist: {
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
      },
    },
  });

  const { apmEventClient } = setup;

  const { aggregations } = await apmEventClient.search(
    'get_page_load_dist_breakdown',
    params
  );

  const pageDistBreakdowns = aggregations?.breakdowns.buckets;

  return pageDistBreakdowns?.map(({ key, page_dist: pageDist }) => {
    let seriesData = pageDist.values?.map(
      ({ key: pKey, value: maybeNullValue }, index: number, arr) => {
        // FIXME: values from percentile* aggs can be null
        const value = maybeNullValue!;
        return {
          x: microToSec(pKey),
          y: index === 0 ? value : value - arr[index - 1].value!,
        };
      }
    );

    // remove 0 values from tail
    seriesData = removeZeroesFromTail(seriesData);

    return {
      name: String(key),
      data: seriesData,
    };
  });
};

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
