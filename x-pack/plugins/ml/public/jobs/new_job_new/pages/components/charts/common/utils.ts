/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpecId, CustomSeriesColorsMap, DataSeriesColorsValues } from '@elastic/charts';

export function getCustomColor(specId: string, color: string): CustomSeriesColorsMap {
  const lineDataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(specId),
  };
  return new Map([[lineDataSeriesColorValues, color]]);
}

export const seriesStyle = {
  line: {
    stroke: '',
    strokeWidth: 2,
    visible: true,
    opacity: 1,
  },
  border: {
    visible: false,
    strokeWidth: 0,
    stroke: '',
  },
  point: {
    visible: false,
    radius: 1,
    stroke: '',
    strokeWidth: 1,
    opacity: 0,
  },
};

export function getYRange(chartData: any) {
  let max: number = Number.MIN_VALUE;
  let min: number = Number.MAX_VALUE;
  chartData.forEach((r: any) => {
    max = Math.max(r.value, max);
    min = Math.min(r.value, min);
  });

  const padding = (max - min) * 0.1;
  max += padding;
  min -= padding;

  return {
    min,
    max,
  };
}

export function getXRange(lineChartData: any) {
  return {
    min: lineChartData[0].time,
    max: lineChartData[lineChartData.length - 1].time,
  };
}
