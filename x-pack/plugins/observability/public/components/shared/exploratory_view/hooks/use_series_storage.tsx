/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouteMatch } from 'react-router-dom';
import {
  IKbnUrlStateStorage,
  ISessionStorageStateStorage,
} from '../../../../../../../../src/plugins/kibana_utils/public';
import type {
  AppDataType,
  ReportViewType,
  SeriesUrl,
  UrlFilter,
  URLReportDefinition,
} from '../types';
import { convertToShortUrl } from '../configurations/utils';
import { OperationType, SeriesType } from '../../../../../../lens/public';
import { URL_KEYS } from '../configurations/constants/url_constants';

export interface SeriesContextValue {
  firstSeries: SeriesUrl;
  autoApply: boolean;
  lastRefresh: number;
  setLastRefresh: (val: number) => void;
  setAutoApply: (val: boolean) => void;
  applyChanges: (val: boolean) => void;
  firstSeriesId: string;
  allSeries: AllSeries;
  setSeries: (seriesIdN: string, newValue: SeriesUrl) => void;
  getSeries: (seriesId: string) => SeriesUrl;
  removeSeries: (seriesId: string) => void;
  setReportType: (reportType: string) => void;
  storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
  reportType: ReportViewType;
}
export const UrlStorageContext = createContext<SeriesContextValue>({} as SeriesContextValue);

interface ProviderProps {
  storage: IKbnUrlStateStorage | ISessionStorageStateStorage;
}

export function convertAllShortSeries(allShortSeries: AllShortSeries) {
  return (allShortSeries ?? []).map((shortSeries) => convertFromShortUrl(shortSeries));
}

export const allSeriesKey = 'sr';
const autoApplyKey = 'autoApply';
const reportTypeKey = 'reportType';

export function UrlStorageContextProvider({
  children,
  storage,
}: ProviderProps & { children: JSX.Element }) {
  const [allSeries, setAllSeries] = useState<AllSeries>(() =>
    convertAllShortSeries(storage.get(allSeriesKey) ?? [])
  );

  const [autoApply, setAutoApply] = useState<boolean>(() => storage.get(autoApplyKey) ?? true);
  const [lastRefresh, setLastRefresh] = useState<number>(() => Date.now());

  const [reportType, setReportType] = useState<string>(
    () => (storage as IKbnUrlStateStorage).get(reportTypeKey) ?? ''
  );

  const [firstSeriesId, setFirstSeriesId] = useState('');

  const [firstSeries, setFirstSeries] = useState<SeriesUrl>();
  const isPreview = !!useRouteMatch('/exploratory-view/preview');

  useEffect(() => {
    const allShortSeries = allSeries.map((series) => convertToShortUrl(series));

    setFirstSeriesId(allSeries.find((seriesT) => seriesT.order === 0)?.name);
    setFirstSeries(allSeries.find((seriesT) => seriesT.order === 0) ?? {});

    if (autoApply) {
      (storage as IKbnUrlStateStorage).set(allSeriesKey, allShortSeries);
    }
  }, [allSeries, autoApply, storage]);

  useEffect(() => {
    // needed for tab change
    const allShortSeries = allSeries.map((series) => convertToShortUrl(series));

    (storage as IKbnUrlStateStorage).set(allSeriesKey, allShortSeries);
    (storage as IKbnUrlStateStorage).set(reportTypeKey, reportType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, storage]);

  const setSeries = useCallback((name: string, newValue: SeriesUrl) => {
    setAllSeries((prevAllSeries) => {
      const newStateRest = prevAllSeries.filter((series) => series.name !== name);

      return [newValue, ...newStateRest];
    });
  }, []);

  useEffect(() => {
    (storage as IKbnUrlStateStorage).set(reportTypeKey, reportType);
  }, [reportType, storage]);

  const removeSeries = useCallback((seriesNameN: string) => {
    setAllSeries((prevAllSeries) =>
      prevAllSeries.filter((seriesT) => seriesT.name !== seriesNameN)
    );
  }, []);

  const getSeries = useCallback(
    (seriesName: string) => {
      return allSeries.find(({ name }) => name === seriesName) ?? {};
    },
    [allSeries]
  );

  const applyChanges = useCallback(() => {
    const allShortSeries = allSeries.map((series) => convertToShortUrl(series));

    (storage as IKbnUrlStateStorage).set(allSeriesKey, allShortSeries);
    setLastRefresh(Date.now());
  }, [allSeries, storage]);

  useEffect(() => {
    (storage as IKbnUrlStateStorage).set(autoApplyKey, autoApply);
  }, [autoApply, storage]);

  const value = {
    autoApply,
    setAutoApply,
    applyChanges,
    storage,
    getSeries,
    setSeries,
    removeSeries,
    firstSeriesId,
    allSeries,
    lastRefresh,
    setLastRefresh,
    setReportType,
    reportType: storage.get(reportTypeKey) as ReportViewType,
    firstSeries: firstSeries!,
  };
  return <UrlStorageContext.Provider value={value}>{children}</UrlStorageContext.Provider>;
}

export function useSeriesStorage() {
  return useContext(UrlStorageContext);
}

function convertFromShortUrl(newValue: ShortUrlSeries): SeriesUrl {
  const { dt, op, st, bd, ft, time, rdf, mt, h, o, n, c, ...restSeries } = newValue;
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
    order: o,
    color: c,
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
  [URL_KEYS.ORDER]: number;
  [URL_KEYS.NAME]: string;
  [URL_KEYS.COLOR]?: string;
  time?: {
    to: string;
    from: string;
  };
}

export type AllShortSeries = ShortUrlSeries[];
export type AllSeries = SeriesUrl[];

export const NEW_SERIES_KEY = 'new-series';
