/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialTheme, LIGHT_THEME, DARK_THEME } from '@elastic/charts';
import { useMemo } from 'react';
import { useTheme } from './use_theme';

export function useChartTheme(): PartialTheme[] {
  const theme = useTheme();
  const baseChartTheme = theme.darkMode ? DARK_THEME : LIGHT_THEME;

  return useMemo(
    () => [
      {
        chartMargins: {
          left: 10,
          right: 10,
          top: 35,
          bottom: 10,
        },
        background: {
          color: 'transparent',
        },
        lineSeriesStyle: {
          point: { visible: false },
        },
        areaSeriesStyle: {
          point: { visible: false },
        },
      },
      baseChartTheme,
    ],
    [baseChartTheme]
  );
}
