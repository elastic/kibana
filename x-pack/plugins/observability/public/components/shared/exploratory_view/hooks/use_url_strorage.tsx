/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import { AppDataType, ReportViewTypeId, SeriesUrl, UrlFilter } from '../types';

export const UrlStorageContext = createContext<IKbnUrlStateStorage | null>(null);

interface ProviderProps {
  storage: IKbnUrlStateStorage;
}
const METRIC_TYPE = 'mt';
const REPORT_TYPE = 'rt';
const SERIES_TYPE = 'st';
const BREAK_DOWN = 'bd';
const FILTERS = 'ft';

export const UrlStorageContextProvider: React.FC<ProviderProps> = ({ children, storage }) => {
  return <UrlStorageContext.Provider value={storage}>{children}</UrlStorageContext.Provider>;
};

function convertToShortUrl(newValue: SeriesUrl): ShortUrlSeries {
  const { metric, seriesType, reportType, breakdown, filters, ...restSeries } = newValue;
  return {
    [METRIC_TYPE]: metric,
    [REPORT_TYPE]: reportType,
    [SERIES_TYPE]: seriesType,
    [BREAK_DOWN]: breakdown,
    [FILTERS]: filters,
    ...restSeries,
  };
}

function convertFromShortUrl(newValue: ShortUrlSeries): SeriesUrl {
  const { mt, st, rt, bd, ft, time, ...restSeries } = newValue;
  return {
    metric: mt,
    reportType: rt!,
    seriesType: st,
    breakdown: bd,
    filters: ft!,
    time: time!,
    ...restSeries,
  };
}

interface ShortUrlSeries {
  [METRIC_TYPE]?: string;
  [REPORT_TYPE]?: ReportViewTypeId;
  [SERIES_TYPE]?: string;
  [BREAK_DOWN]?: string;
  [FILTERS]?: UrlFilter[];
  time?: {
    to: string;
    from: string;
  };
  dataType?: AppDataType;
  reportDefinitions?: Record<string, string>;
}

export type AllShortSeries = Record<string, ShortUrlSeries>;
export type AllSeries = Record<string, SeriesUrl>;

export const NEW_SERIES_KEY = 'newSeriesKey';

export function useUrlStorage(seriesId?: string) {
  const allSeriesKey = 'sr';
  const storage = useContext((UrlStorageContext as unknown) as Context<IKbnUrlStateStorage>);
  let series: SeriesUrl = {} as SeriesUrl;
  const allShortSeries = storage.get<AllShortSeries>(allSeriesKey) ?? {};

  const allSeriesIds = Object.keys(allShortSeries);

  const allSeries: AllSeries = {};

  allSeriesIds.forEach((seriesKey) => {
    allSeries[seriesKey] = convertFromShortUrl(allShortSeries[seriesKey]);
  });

  if (seriesId) {
    series = allSeries?.[seriesId] ?? ({} as SeriesUrl);
  }

  const setSeries = async (seriesIdN: string, newValue: SeriesUrl) => {
    allShortSeries[seriesIdN] = convertToShortUrl(newValue);
    allSeries[seriesIdN] = newValue;
    return storage.set(allSeriesKey, allShortSeries);
  };

  const removeSeries = (seriesIdN: string) => {
    delete allShortSeries[seriesIdN];
    delete allSeries[seriesIdN];
    storage.set(allSeriesKey, allSeries);
  };

  const firstSeriesId = allSeriesIds?.[0];

  return {
    storage,
    setSeries,
    removeSeries,
    series,
    firstSeriesId,
    allSeries,
    allSeriesIds,
    firstSeries: allSeries?.[firstSeriesId],
  };
}
