/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  IKbnUrlStateStorage,
  ISessionStorageStateStorage,
} from '../../../../../../../../src/plugins/kibana_utils/public';
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

export interface SeriesContextValue {
  firstSeries: SeriesUrl;
  firstSeriesId: string;
  allSeriesIds: string[];
  allSeries: AllSeries;
  setSeries: (seriesIdN: string, newValue: SeriesUrl) => void;
  getSeries: (seriesId: string) => SeriesUrl;
  removeSeries: (seriesId: string) => void;
}
export const UrlStorageContext = createContext<SeriesContextValue>({} as SeriesContextValue);

interface ProviderProps {
  storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
}

export function UrlStorageContextProvider({
  children,
  storage,
}: ProviderProps & { children: JSX.Element }) {
  const allSeriesKey = 'sr';

  const [allShortSeries, setAllShortSeries] = useState<AllShortSeries>(
    () => storage.get(allSeriesKey) ?? {}
  );
  const [allSeries, setAllSeries] = useState<AllSeries>({});
  const [firstSeriesId, setFirstSeriesId] = useState('');

  useEffect(() => {
    const allSeriesIds = Object.keys(allShortSeries);
    const allSeriesN: AllSeries = {};
    allSeriesIds.forEach((seriesKey) => {
      allSeriesN[seriesKey] = convertFromShortUrl(allShortSeries[seriesKey]);
    });

    setAllSeries(allSeriesN);
    setFirstSeriesId(allSeriesIds?.[0]);
    (storage as IKbnUrlStateStorage).set(allSeriesKey, allShortSeries);
  }, [allShortSeries, storage]);

  const setSeries = (seriesIdN: string, newValue: SeriesUrl) => {
    setAllShortSeries((prevState) => {
      prevState[seriesIdN] = convertToShortUrl(newValue);
      return { ...prevState };
    });
  };

  const removeSeries = (seriesIdN: string) => {
    delete allShortSeries[seriesIdN];
    delete allSeries[seriesIdN];
  };

  const allSeriesIds = Object.keys(allShortSeries);

  const getSeries = useCallback(
    (seriesId?: string) => {
      return seriesId ? allSeries?.[seriesId] ?? {} : ({} as SeriesUrl);
    },
    [allSeries]
  );

  const value = {
    storage,
    getSeries,
    setSeries,
    removeSeries,
    firstSeriesId,
    allSeries,
    allSeriesIds,
    firstSeries: allSeries?.[firstSeriesId],
  };
  return <UrlStorageContext.Provider value={value}>{children}</UrlStorageContext.Provider>;
}

export function useSeriesStorage() {
  return useContext(UrlStorageContext);
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
