/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RecursivePartial, Theme } from '@elastic/charts';
import { merge } from 'lodash';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

const profilingTheme: RecursivePartial<Theme> = {
  barSeriesStyle: {
    rectBorder: {
      strokeOpacity: 1,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 0.6,
    },
  },
  scales: {
    barsPadding: 0,
    histogramPadding: 0,
  },
};

export function useProfilingChartsTheme() {
  const {
    start: { charts },
  } = useProfilingDependencies();

  const chartsBaseTheme = charts.theme.useChartsBaseTheme();
  const chartsTheme = charts.theme.useChartsTheme();

  return {
    chartsBaseTheme,
    chartsTheme: merge({}, chartsTheme, profilingTheme),
  };
}
