/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEsSearch } from '@kbn/observability-plugin/public';
import {
  microToSec,
  removeZeroesFromTail,
} from '../../../../services/data/page_load_distribution_query';
import { callDateMath } from '../../../../services/data/call_date_math';
import { getPageLoadDistBreakdown } from '../../../../services/data/page_load_distribution_breakdown_query';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { PercentileRange } from './types';

interface Props {
  percentileRange?: PercentileRange;
  field: string;
  value: string;
  dataViewTitle?: string;
}

export const useBreakdowns = ({
  dataViewTitle,
  percentileRange,
  value,
}: Props) => {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { start: startString, end: endString } = urlParams;
  const start = callDateMath(startString);
  const end = callDateMath(endString);

  const { apm, ...params } = useMemo(
    () =>
      getPageLoadDistBreakdown({
        uiFilters: uxUiFilters,
        percentileRange,
        breakdown: value,
        start,
        end,
      }),
    [uxUiFilters, percentileRange, value, start, end]
  );

  const { data, loading } = useEsSearch(
    {
      index: params && dataViewTitle ? dataViewTitle : undefined,
      ...params,
    },
    [JSON.stringify(params), dataViewTitle],
    { name: 'UXBreakdowns' }
  );

  return {
    breakdowns: useMemo(() => {
      if (!data) return [];
      const { aggregations } = data;

      const pageDistBreakdowns = aggregations?.breakdowns.buckets;

      return pageDistBreakdowns?.map(({ key, page_dist: pageDist }) => {
        // @ts-ignore inferred es response type for `pageDist.values` incompatible
        let seriesData = pageDist.values?.map(
          (datum: any, index: number, arr: any[]) => {
            // FIXME: values from percentile* aggs can be null
            const maybeNullValue = datum.value!;
            return {
              x: microToSec(datum.key),
              y:
                index === 0
                  ? maybeNullValue
                  : maybeNullValue - arr[index - 1].value!,
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
    }, [data]),
    loading: !!loading,
  };
};
