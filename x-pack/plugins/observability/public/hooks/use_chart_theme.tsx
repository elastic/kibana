/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { useTheme } from './use_theme';

export function useChartTheme() {
  const theme = useTheme();
  const baseChartTheme = theme.darkMode
    ? EUI_CHARTS_THEME_DARK.theme
    : EUI_CHARTS_THEME_LIGHT.theme;

  return {
    ...baseChartTheme,
    background: {
      ...baseChartTheme.background,
      color: 'transparent',
    },
    lineSeriesStyle: {
      ...baseChartTheme.lineSeriesStyle,
      point: { visible: false },
    },
    areaSeriesStyle: {
      ...baseChartTheme.areaSeriesStyle,
      point: { visible: false },
    },
  };
}
