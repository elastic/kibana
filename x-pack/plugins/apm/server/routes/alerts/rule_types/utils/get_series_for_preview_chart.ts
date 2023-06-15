/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BarSeriesData } from '../../../../../common/rules/apm_rule_types';

export type BarSeriesDataMap = Record<
  string,
  Array<{ x: number; y: number | null }>
>;

type BarSeries = Array<{
  name: string;
  data: Array<{
    x: number;
    y: number | null;
  }>;
}>;

const NUM_SERIES = 5;

export const getFilteredBarSeries = (barSeries: BarSeries) => {
  const sortedSeries = barSeries.sort((a, b) => {
    const aMax = Math.max(...a.data.map((point) => point.y as number));
    const bMax = Math.max(...b.data.map((point) => point.y as number));
    return bMax - aMax;
  });

  const filteredSeries = sortedSeries.slice(0, NUM_SERIES);

  const series = filteredSeries.reduce<BarSeriesData[]>((acc, serie) => {
    const barPoints = serie.data.reduce<BarSeriesData[]>((pointAcc, point) => {
      return [...pointAcc, { ...point, group: serie.name }];
    }, []);
    return [...acc, ...barPoints];
  }, []);

  return {
    series,
    displayedGroups: filteredSeries.length,
    totalGroups: barSeries.length,
  };
};
