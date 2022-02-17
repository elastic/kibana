/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../components/shared/time_comparison/get_time_range_comparison';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

export function useComparison() {
  const comparisonChartTheme = getComparisonChartTheme();
  const { query } = useApmParams('/*');

  if (!('rangeFrom' in query && 'rangeTo' in query)) {
    throw new Error('rangeFrom or rangeTo not defined in query');
  }

  const { start, end } = useTimeRange({
    rangeFrom: query.rangeFrom,
    rangeTo: query.rangeTo,
  });

  const {
    urlParams: { comparisonType, comparisonEnabled },
  } = useLegacyUrlParams();

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  return {
    offset,
    comparisonChartTheme,
  };
}
