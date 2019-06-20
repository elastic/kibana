/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ChartSettings {
  width: string;
  height: string;
  cols: number;
  intervalMs: number;
}

export const defaultChartSettings: ChartSettings = {
  width: '100%',
  height: '300px',
  cols: 1,
  intervalMs: 0,
};

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
