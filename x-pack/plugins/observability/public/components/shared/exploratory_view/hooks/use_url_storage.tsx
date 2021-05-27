/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import type {
  AppDataType,
  ReportViewTypeId,
  SeriesUrl,
  UrlFilter,
  URLReportDefinition,
} from '../types';
import { convertToShortUrl } from '../configurations/utils';
import { OperationType, SeriesType } from '../../../../../../lens/public';
import { URL_KEYS } from '../configurations/constants/url_constants';

export const UrlStorageContext = createContext<IKbnUrlStateStorage | null>(null);

interface ProviderProps {
  storage: IKbnUrlStateStorage;
}

export function UrlStorageContextProvider({
  children,
  storage,
}: ProviderProps & { children: JSX.Element }) {
  return <UrlStorageContext.Provider value={storage}>{children}</UrlStorageContext.Provider>;
}

function convertFromShortUrl(newValue: ShortUrlSeries): SeriesUrl {
  const { dt, op, st, rt, bd, ft, time, rdf, ...restSeries } = newValue;
  return {
    operationType: op,
    reportType: rt!,
    seriesType: st,
    breakdown: bd,
    filters: ft!,
    time: time!,
    reportDefinitions: rdf,
    dataType: dt!,
    ...restSeries,
  };
}

interface ShortUrlSeries {
  [URL_KEYS.OPERATION_TYPE]?: OperationType;
  [URL_KEYS.REPORT_TYPE]?: ReportViewTypeId;
  [URL_KEYS.DATA_TYPE]?: AppDataType;
  [URL_KEYS.SERIES_TYPE]?: SeriesType;
  [URL_KEYS.BREAK_DOWN]?: string;
  [URL_KEYS.FILTERS]?: UrlFilter[];
  [URL_KEYS.REPORT_DEFINITIONS]?: URLReportDefinition;
  time?: {
    to: string;
    from: string;
  };
}

export type AllShortSeries = Record<string, ShortUrlSeries>;
export type AllSeries = Record<string, SeriesUrl>;

export const NEW_SERIES_KEY = 'new-series-key';

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
    storage.set(allSeriesKey, allShortSeries);
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
