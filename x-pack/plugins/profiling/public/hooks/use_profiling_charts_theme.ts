/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PartialTheme } from '@elastic/charts';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

const profilingThemeOverrides: PartialTheme = {
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
  partition: {
    fillLabel: {
      textColor: 'white',
    },
    emptySizeRatio: 0.3,
    sectorLineWidth: 0,
  },
};

export function useProfilingChartsTheme() {
  const {
    start: { charts },
  } = useProfilingDependencies();

  const chartsBaseTheme = charts.theme.useChartsBaseTheme();

  return {
    chartsBaseTheme,
    chartsTheme: profilingThemeOverrides,
  };
}
