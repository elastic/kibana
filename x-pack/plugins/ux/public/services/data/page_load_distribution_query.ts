/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { TRANSACTION_DURATION } from '../../../common/elasticsearch_fieldnames';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { useDataView } from '../../components/app/rum_dashboard/local_uifilters/use_data_view';
import { callDateMath } from './call_date_math';
import { getRumPageLoadTransactionsProjection } from './projections';

export interface PercentileRange {
  min?: number | null;
  max?: number | null;
}

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

export function usePageLoadDistribution(
  uxUiFilters: UxUIFilters,
  percentileRange: PercentileRange,
  rangeId: number,
  startString?: string,
  endString?: string
) {
  const minPercentile = Number.isSafeInteger(percentileRange.min)
    ? String(percentileRange.min)
    : undefined;
  const maxPercentile = Number.isSafeInteger(percentileRange.max)
    ? String(percentileRange.max)
    : undefined;

  const start = callDateMath(startString);
  const end = callDateMath(endString);

  const { params, minDuration, maxDuration } = useMemo(
    () =>
      pageLoadDistributionQuery({
        uiFilters: uxUiFilters,
        start,
        end,
        minPercentile,
        maxPercentile,
      }),
    // `rangeId` acts as a cache buster for stable ranges like "Today"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uxUiFilters, start, end, minPercentile, maxPercentile, rangeId]
  );
  const { dataViewTitle } = useDataView();
  const pageDistributionRequest = useEsSearch(
    {
      index: dataViewTitle,
      ...params,
    },
    [params, dataViewTitle],
    { name: 'UXPageLoadDistribution' }
  );

  const { durPercentiles, loadDistribution } =
    pageDistributionRequest?.data?.aggregations ?? {};

  let pageDistVals: Array<{ key: number; value: number | null }> = [];
  if (loadDistribution?.values) {
    // @ts-ignore inferred types for `values` incompatible with actual data
    pageDistVals = loadDistribution.values;
  }
  const maxPercQuery = durPercentiles?.values['99.0'] ?? 0;

  const percDistRequest = useEsSearch(
    {
      index:
        maxPercQuery > maxDuration && !maxPercentile
          ? dataViewTitle
          : undefined,
      ...getPercentilesDistribution({
        uiFilters: uxUiFilters,
        start,
        end,
        maxDuration: maxPercQuery,
        minDuration: maxDuration,
      }),
    },
    [dataViewTitle, uxUiFilters, start, end, maxDuration, minDuration],
    { name: 'UXGetPercentilesDistribution' }
  );
  if (percDistRequest.data) {
    pageDistVals = pageDistVals.concat(
      // @ts-ignore inferred types for `values` incompatible with actual data
      percDistRequest.data?.aggregations?.loadDistribution?.values ?? []
    );
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
    maxDuration: percDistRequest.data ? maxPercQuery : microToSec(maxDuration),
    loading: pageDistributionRequest.loading,
  };
}

export function getPercentilesDistribution({
  uiFilters,
  start,
  end,
  maxDuration,
  minDuration,
}: {
  uiFilters: UxUIFilters;
  start: number;
  end: number;
  maxDuration: number;
  minDuration: number;
}) {
  const setup: SetupUX = { uiFilters: uiFilters ?? {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    start,
    end,
  });
  const stepValues = getPLDChartSteps({
    maxDuration,
    minDuration,
  });

  return mergeProjection(projection, {
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

export function pageLoadDistributionQuery({
  uiFilters,
  urlQuery,
  start,
  end,
  minPercentile,
  maxPercentile,
}: {
  uiFilters?: UxUIFilters;
  urlQuery?: string;
  start: number;
  end: number;
  minPercentile?: string;
  maxPercentile?: string;
}) {
  const setup: SetupUX = { uiFilters: uiFilters ?? {} };
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
  const maxDuration = (maxPercentile ? +maxPercentile : 50) * MICRO_TO_SEC;
  const minDuration = minPercentile ? +minPercentile * MICRO_TO_SEC : 0;

  const stepValues = getPLDChartSteps({
    maxDuration,
    minDuration,
  });

  const query = {
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
  };
  const params = mergeProjection<any, typeof query>(projection, query);
  return { params, maxDuration, minDuration };
}
