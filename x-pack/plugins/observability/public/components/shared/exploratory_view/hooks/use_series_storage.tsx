/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IKbnUrlStateStorage, ISessionStorageStateStorage } from '@kbn/kibana-utils-plugin/public';
import { OperationType, SeriesType } from '@kbn/lens-plugin/public';
import { ChartTimeRange } from '../header/last_updated';
import { useUiTracker } from '../../../../hooks/use_track_metric';
import type {
  AppDataType,
  ReportViewType,
  SeriesUrl,
  UrlFilter,
  URLReportDefinition,
} from '../types';
import { convertToShortUrl } from '../configurations/exploratory_view_url';
import { URL_KEYS } from '../configurations/constants/url_constants';
import { trackTelemetryOnApply } from '../utils/telemetry';

export interface SeriesContextValue {
  firstSeries?: SeriesUrl;
  lastRefresh: number;
  setLastRefresh: (val: number) => void;
  applyChanges: (onApply?: () => void) => void;
  allSeries: AllSeries;
  setSeries: (seriesIndex: number, newValue: SeriesUrl) => void;
  getSeries: (seriesIndex: number) => SeriesUrl | undefined;
  removeSeries: (seriesIndex: number) => void;
  setReportType: (reportType: ReportViewType) => void;
  storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
  reportType: ReportViewType;
  chartTimeRangeContext?: ChartTimeRange;
  setChartTimeRangeContext: React.Dispatch<React.SetStateAction<ChartTimeRange | undefined>>;
}
export const UrlStorageContext = createContext<SeriesContextValue>({} as SeriesContextValue);

interface ProviderProps {
  storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
}

export function convertAllShortSeries(allShortSeries: AllShortSeries) {
  return (allShortSeries ?? []).map((shortSeries) => convertFromShortUrl(shortSeries));
}

export const allSeriesKey = 'sr';
export const reportTypeKey = 'reportType';

export function UrlStorageContextProvider({
  children,
  storage,
}: ProviderProps & { children: JSX.Element }) {
  const [allSeries, setAllSeries] = useState<AllSeries>(() =>
    convertAllShortSeries(storage.get(allSeriesKey) ?? [])
  );

  const [lastRefresh, setLastRefresh] = useState<number>(() => Date.now());

  const [chartTimeRangeContext, setChartTimeRangeContext] = useState<ChartTimeRange | undefined>();

  const [reportType, setReportType] = useState<ReportViewType>(
    () => ((storage as IKbnUrlStateStorage).get(reportTypeKey) ?? '') as ReportViewType
  );

  const [firstSeries, setFirstSeries] = useState<SeriesUrl>();

  const trackEvent = useUiTracker();

  useEffect(() => {
    const firstSeriesT = allSeries?.[0];

    setFirstSeries(firstSeriesT);
  }, [allSeries, storage]);

  const setSeries = useCallback((seriesIndex: number, newValue: SeriesUrl) => {
    setAllSeries((prevAllSeries) => {
      const seriesWithCurrentBreakdown = prevAllSeries.findIndex((series) => series.breakdown);
      const newStateRest = prevAllSeries.map((series, index) => {
        if (index === seriesIndex) {
          return {
            ...newValue,
            breakdown:
              seriesWithCurrentBreakdown === seriesIndex || seriesWithCurrentBreakdown === -1
                ? newValue.breakdown
                : undefined,
          };
        }
        return series;
      });

      if (prevAllSeries.length === seriesIndex) {
        return [...newStateRest, newValue];
      }

      return [...newStateRest];
    });
  }, []);

  const removeSeries = useCallback((seriesIndex: number) => {
    setAllSeries((prevAllSeries) =>
      prevAllSeries.filter((seriesT, index) => index !== seriesIndex)
    );
  }, []);

  const getSeries = useCallback(
    (seriesIndex: number) => {
      return allSeries[seriesIndex];
    },
    [allSeries]
  );

  const applyChanges = useCallback(
    (onApply?: () => void) => {
      const allShortSeries = allSeries.map((series) => convertToShortUrl(series));
      (storage as IKbnUrlStateStorage).set(reportTypeKey, reportType);

      (storage as IKbnUrlStateStorage).set(allSeriesKey, allShortSeries);
      setLastRefresh(Date.now());

      trackTelemetryOnApply(trackEvent, allSeries, reportType);

      if (onApply) {
        onApply();
      }
    },
    [allSeries, storage, trackEvent, reportType]
  );

  const value = {
    applyChanges,
    storage,
    getSeries,
    setSeries,
    removeSeries,
    allSeries,
    lastRefresh,
    setLastRefresh,
    setReportType,
    reportType,
    chartTimeRangeContext,
    setChartTimeRangeContext,
    firstSeries: firstSeries!,
  };
  return <UrlStorageContext.Provider value={value}>{children}</UrlStorageContext.Provider>;
}

export function useSeriesStorage() {
  return useContext(UrlStorageContext);
}

function convertFromShortUrl(newValue: ShortUrlSeries): SeriesUrl {
  const { dt, op, st, bd, ft, time, rdf, mt, h, n, c, spa, ...restSeries } = newValue;
  return {
    operationType: op,
    seriesType: st,
    breakdown: bd,
    filters: ft!,
    time: time!,
    reportDefinitions: rdf,
    dataType: dt!,
    selectedMetricField: mt,
    hidden: h,
    name: n,
    color: c,
    showPercentileAnnotations: spa,
    ...restSeries,
  };
}

interface ShortUrlSeries {
  [URL_KEYS.OPERATION_TYPE]?: OperationType;
  [URL_KEYS.DATA_TYPE]?: AppDataType;
  [URL_KEYS.SERIES_TYPE]?: SeriesType;
  [URL_KEYS.BREAK_DOWN]?: string;
  [URL_KEYS.FILTERS]?: UrlFilter[];
  [URL_KEYS.REPORT_DEFINITIONS]?: URLReportDefinition;
  [URL_KEYS.SELECTED_METRIC]?: string;
  [URL_KEYS.HIDDEN]?: boolean;
  [URL_KEYS.NAME]: string;
  [URL_KEYS.COLOR]?: string;
  [URL_KEYS.SHOW_PERCENTILE_ANNOTATIONS]?: boolean;
  time?: {
    to: string;
    from: string;
  };
}

export type AllShortSeries = ShortUrlSeries[];
export type AllSeries = SeriesUrl[];

export const NEW_SERIES_KEY = 'new-series';
