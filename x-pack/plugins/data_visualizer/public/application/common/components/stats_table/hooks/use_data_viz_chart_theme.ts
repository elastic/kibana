/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme } from '@elastic/charts';
import { useMemo } from 'react';
import { useCurrentEuiTheme } from '../../../hooks/use_current_eui_theme';
export const useDataVizChartTheme = (): PartialTheme => {
  const euiTheme = useCurrentEuiTheme();
  const chartTheme = useMemo<PartialTheme>(() => {
    const AREA_SERIES_COLOR = euiTheme.euiColorVis0;
    return {
      axes: {
        tickLabel: {
          fontSize: parseInt(euiTheme.euiFontSizeXS, 10),
          fontFamily: euiTheme.euiFontFamily,
          fontStyle: 'italic',
        },
      },
      background: { color: 'transparent' },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 4,
        bottom: 0,
      },
      scales: { barsPadding: 0.1 },
      colors: {
        vizColors: [AREA_SERIES_COLOR],
      },
      areaSeriesStyle: {
        line: {
          strokeWidth: 1,
          visible: true,
        },
        point: {
          visible: false,
          radius: 0,
          opacity: 0,
        },
        area: { visible: true, opacity: 1 },
      },
    };
  }, [euiTheme]);
  return chartTheme;
};
