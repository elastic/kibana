/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FC, useEffect } from 'react';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  useAppDispatch,
  useCurrentSelectedSignificantItem,
  useCurrentSelectedGroup,
  setDocumentCountChartData,
} from '@kbn/aiops-log-rate-analysis/state';

import { DEFAULT_SEARCH_QUERY } from './log_rate_analysis_content';

import { useData } from '../../../hooks/use_data';
import { useDataSource } from '../../../hooks/use_data_source';

export interface LogRateAnalysisDocumentcountChartDataProps {
  /** Optional time range */
  timeRange?: { min: Moment; max: Moment };
  /** Optional Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
}

export const LogRateAnalysisDocumentCountChartData: FC<
  LogRateAnalysisDocumentcountChartDataProps
> = ({ timeRange, esSearchQuery }) => {
  const { dataView } = useDataSource();

  const currentSelectedGroup = useCurrentSelectedGroup();
  const currentSelectedSignificantItem = useCurrentSelectedSignificantItem();
  const dispatch = useAppDispatch();

  const { documentStats, earliest, latest, intervalMs } = useData(
    dataView,
    'log_rate_analysis',
    esSearchQuery ?? DEFAULT_SEARCH_QUERY,
    undefined,
    currentSelectedSignificantItem,
    currentSelectedGroup,
    undefined,
    true,
    timeRange
  );

  // TODO Since `useData` isn't just used within Log Rate Analysis, this is a bit of
  // a workaround to pass the result on to the redux store. At least this ensures
  // we now use `useData` only once across Log Rate Analysis! Originally `useData`
  // was quite general, but over time it got quite some specific features used
  // across Log Rate Analysis and Pattern Analysis. We discussed that we should
  // split this up into more specific hooks.
  useEffect(() => {
    dispatch(
      setDocumentCountChartData({
        earliest,
        latest,
        intervalMs,
        documentStats,
      })
    );
  }, [documentStats, dispatch, earliest, intervalMs, latest]);

  return null;
};
