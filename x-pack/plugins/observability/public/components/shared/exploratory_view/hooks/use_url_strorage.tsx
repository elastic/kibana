/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { IKbnUrlStateStorage } from '../../../../../../../../src/plugins/kibana_utils/public';
import { SeriesUrl } from '../types';

export const UrlStorageContext = createContext<IKbnUrlStateStorage | null>(null);

interface ProviderProps {
  storage: IKbnUrlStateStorage;
}

export const UrlStorageContextProvider: React.FC<ProviderProps> = ({ children, storage }) => {
  return <UrlStorageContext.Provider value={storage}>{children}</UrlStorageContext.Provider>;
};

type AllSeries = Record<string, SeriesUrl>;

export const useUrlStorage = (seriesId?: string) => {
  const allSeriesKey = 'sr';
  const storage = useContext((UrlStorageContext as unknown) as Context<IKbnUrlStateStorage>);
  let series: SeriesUrl = {} as SeriesUrl;
  const allSeries = storage.get<AllSeries>(allSeriesKey) ?? {};

  if (seriesId) {
    series = allSeries?.[seriesId] ?? ({} as SeriesUrl);
  }

  const setSeries = (seriesId: string, newValue: SeriesUrl) => {
    allSeries[seriesId] = newValue;
    storage.set(allSeriesKey, allSeries);
  };

  const removeSeries = (seriesId: string) => {
    delete allSeries[seriesId];
    storage.set(allSeriesKey, allSeries);
  };

  const allSeriesIds = Object.keys(allSeries);

  const firstSeries = allSeriesIds?.[0];

  return { storage, setSeries, removeSeries, series, firstSeries, allSeries, allSeriesIds };
};
