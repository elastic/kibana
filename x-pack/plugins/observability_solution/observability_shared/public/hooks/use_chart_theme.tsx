/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME, DARK_THEME, PartialTheme } from '@elastic/charts';
import { useEuiTheme, COLOR_MODES_STANDARD } from '@elastic/eui';
import { useMemo } from 'react';

export function useChartThemes() {
  const theme = useEuiTheme();
  const baseTheme = theme.colorMode === COLOR_MODES_STANDARD.dark ? DARK_THEME : LIGHT_THEME;

  return useMemo(() => {
    const themeOverrides: PartialTheme = {
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
        point: { visible: 'never' },
      },
      areaSeriesStyle: {
        point: { visible: 'never' },
      },
    };

    return {
      theme: [themeOverrides],
      baseTheme,
    };
  }, [baseTheme]);
}
