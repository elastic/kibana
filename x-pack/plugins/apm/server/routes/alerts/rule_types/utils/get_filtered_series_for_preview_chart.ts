/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../../../../typings/timeseries';

export type BarSeriesDataMap = Record<string, Coordinate[]>;
type BarSeriesData = Array<{ name: string; data: Coordinate[] }>;

const NUM_SERIES = 5;

export const getFilteredBarSeries = (barSeries: BarSeriesData) => {
  const sortedSeries = barSeries.sort((a, b) => {
    const aMax = Math.max(...a.data.map((point) => point.y as number));
    const bMax = Math.max(...b.data.map((point) => point.y as number));
    return bMax - aMax;
  });

  return sortedSeries.slice(0, NUM_SERIES);
};
