/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import type { PartialTheme } from '@elastic/charts';
import { useUiSettings } from '../../../contexts/kibana';
export const useDataVizChartTheme = (): PartialTheme => {
  const isDarkTheme = useUiSettings().get('theme:darkMode');
  const themeName = isDarkTheme ? darkTheme : lightTheme;
  const AREA_SERIES_COLOR = themeName.euiColorVis0;
  return {
    axes: {
      tickLabel: {
        fontSize: parseInt(themeName.euiFontSizeXS, 10),
        fontFamily: themeName.euiFontFamily,
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
};
