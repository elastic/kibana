/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useMemo } from 'react';
import {
  AllSeries,
  allSeriesKey,
  convertAllShortSeries,
  useSeriesStorage,
} from './use_series_storage';

import { ReportViewType, SeriesUrl } from '../types';
import { ReportTypes } from '../configurations/constants';

export const combineTimeRanges = (
  reportType: ReportViewType,
  allSeries: SeriesUrl[],
  firstSeries?: SeriesUrl
) => {
  let to: string = '';
  let from: string = '';

  if (reportType === ReportTypes.KPI) {
    return firstSeries?.time;
  }

  allSeries.forEach((series) => {
    if (
      series.dataType &&
      series.selectedMetricField &&
      !isEmpty(series.reportDefinitions) &&
      series.time
    ) {
      const seriesTo = new Date(series.time.to);
      const seriesFrom = new Date(series.time.from);
      if (!to || seriesTo > new Date(to)) {
        to = series.time.to;
      }
      if (!from || seriesFrom < new Date(from)) {
        from = series.time.from;
      }
    }
  });

  return { to, from };
};
export const useExpViewTimeRange = () => {
  const { storage, reportType, lastRefresh, firstSeries } = useSeriesStorage();

  return useMemo(() => {
    // we only use the data from url to apply, since that get updated to apply changes
    const allSeriesFromUrl: AllSeries = convertAllShortSeries(storage.get(allSeriesKey) ?? []);
    const firstSeriesT = allSeriesFromUrl?.[0];

    return firstSeriesT ? combineTimeRanges(reportType, allSeriesFromUrl, firstSeriesT) : undefined;
    // we want to keep last refresh in dependencies to force refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, storage, lastRefresh, firstSeries]);
};
