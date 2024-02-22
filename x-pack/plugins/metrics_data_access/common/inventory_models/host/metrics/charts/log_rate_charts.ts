/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

export const logRateCharts = {
  xy: {
    logRate: {
      id: 'logRate',
      chartType: 'xy',
      title: formulas.logRate.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [formulas.logRate],
        },
      ],
      fittingFunction: 'Linear',
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
      },
    } as LensConfigWithId,
  },
};
