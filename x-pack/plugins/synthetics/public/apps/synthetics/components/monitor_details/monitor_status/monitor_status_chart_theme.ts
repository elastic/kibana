/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeatmapStyle, RecursivePartial } from '@elastic/charts';
import { EuiThemeComputed } from '@elastic/eui';
import { CHART_CELL_WIDTH } from './monitor_status_data';

export function getMonitorStatusChartTheme(
  euiTheme: EuiThemeComputed,
  brushable: boolean
): RecursivePartial<HeatmapStyle> {
  return {
    grid: {
      cellHeight: {
        min: 20,
      },
      stroke: {
        width: 0,
        color: 'transparent',
      },
    },
    maxRowHeight: 30,
    maxColumnWidth: CHART_CELL_WIDTH,
    cell: {
      maxWidth: 'fill',
      maxHeight: 3,
      label: {
        visible: false,
      },
      border: {
        stroke: 'transparent',
        strokeWidth: 0.5,
      },
    },
    xAxisLabel: {
      visible: true,
      fontSize: 10,
      fontFamily: euiTheme.font.family,
      fontWeight: euiTheme.font.weight.light,
      textColor: euiTheme.colors.subduedText,
    },
    yAxisLabel: {
      visible: false,
    },
    brushTool: {
      visible: brushable,
      fill: euiTheme.colors.darkShade,
    },
  };
}
