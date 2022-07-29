/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME, XYChartSeriesIdentifier } from '@elastic/charts';
import { AlertChartData } from './types';

export const formatChartAlertData = (
  data: AlertChartData[]
): Array<{ x: string; y: number; g: string }> =>
  data.map((alert) => ({
    x: alert.date,
    y: alert.count,
    g: alert.status,
  }));

export const getColorSeries = ({ seriesKeys }: XYChartSeriesIdentifier) => {
  switch (seriesKeys[0]) {
    case 'active':
      return LIGHT_THEME.colors.vizColors[1];
    case 'recovered':
      return LIGHT_THEME.colors.vizColors[2];
    default:
      return null;
  }
};
