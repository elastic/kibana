/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Theme,
  PartialTheme,
  LIGHT_THEME,
  DARK_THEME,
  mergeWithDefaultTheme,
} from '@elastic/charts';

// TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
export function getChartTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? DARK_THEME : LIGHT_THEME;
}

export function getTimelineChartTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? DARK_THEME : mergeWithDefaultTheme(TIMELINE_LIGHT_THEME, LIGHT_THEME);
}

const TIMELINE_LIGHT_THEME: PartialTheme = {
  crosshair: {
    band: {
      fill: '#D3DAE6',
    },
  },
  axes: {
    gridLine: {
      horizontal: {
        stroke: '#eaeaea',
      },
    },
  },
};
