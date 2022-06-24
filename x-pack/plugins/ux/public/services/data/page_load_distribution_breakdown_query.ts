/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  TRANSACTION_DURATION,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../common/elasticsearch_fieldnames';
import { PercentileRange } from './page_load_distribution_query';
import { getRumPageLoadTransactionsProjection } from './projections';

const MICRO_TO_SEC = 1000000;

const getPLDChartSteps = ({
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

const getBreakdownField = (breakdown: string) => {
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

export function getPageLoadDistBreakdown({
  uiFilters,
  percentileRange,
  breakdown,
  urlQuery,
  start,
  end,
}: {
  uiFilters?: UxUIFilters;
  percentileRange?: PercentileRange;
  breakdown: string;
  start: number;
  end: number;
  urlQuery?: string;
}) {
  const maxPercentile = percentileRange?.max;
  const minPercentile = percentileRange?.min;
  // convert secs to micros
  const stepValues = getPLDChartSteps({
    maxDuration: (maxPercentile ? +maxPercentile : 50) * MICRO_TO_SEC,
    minDuration: minPercentile ? +minPercentile * MICRO_TO_SEC : 0,
  });

  const setup: SetupUX = { uiFilters: uiFilters ?? {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
    start,
    end,
  });

  return mergeProjection(projection, {
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
}
