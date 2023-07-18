/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SettingsProps } from '@elastic/charts';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

export function useTimelineChartTheme(): Pick<SettingsProps, 'baseTheme' | 'theme'> {
  const {
    services: { charts },
  } = useKibanaContextForPlugin();

  const baseTheme = charts.theme.useChartsBaseTheme();
  const theme = charts.theme.useChartsTheme();

  return {
    baseTheme,
    theme: {
      ...theme,
      background: {
        ...theme.background,
        color: 'transparent',
      },
      crosshair: {
        band: {
          ...theme.crosshair?.band,
          fill: '#d3dae6',
        },
      },
      axes: {
        gridLine: {
          horizontal: {
            visible: false,
          },
          vertical: {
            ...theme.axes?.gridLine?.vertical,
            dash: undefined,
          },
        },
      },
    },
  };
}
