/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DARK_THEME,
  LIGHT_THEME,
  mergeWithDefaultTheme,
  PartialTheme,
  Rendering,
  Rotation,
  ScaleType,
  SettingsSpecProps,
  TickFormatter,
  Position,
  BrushEndListener,
} from '@elastic/charts';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { useUiSetting } from '../../lib/kibana';

export const defaultChartHeight = '100%';
export const defaultChartWidth = '100%';
const chartDefaultRotation: Rotation = 0;
const chartDefaultRendering: Rendering = 'canvas';

export type UpdateDateRange = BrushEndListener;

export interface ChartData {
  x?: number | string | null;
  y?: number | string | null;
  y0?: number;
  g?: number | string | null;
}

export interface ChartSeriesConfigs {
  customHeight?: number;
  color?: string[];
  series?: {
    xScaleType?: ScaleType | undefined;
    yScaleType?: ScaleType | undefined;
  };
  axis?: {
    xTickFormatter?: TickFormatter | undefined;
    yTickFormatter?: TickFormatter | undefined;
  };
  settings?: Partial<SettingsSpecProps>;
}

export interface ChartSeriesData {
  key: string;
  value: ChartData[] | [] | null;
  color?: string | undefined;
}

const WrappedByAutoSizerComponent = styled.div<{ height?: string }>`
  ${(style) =>
    `
    height: ${style.height != null ? style.height : defaultChartHeight};
  `}
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

WrappedByAutoSizerComponent.displayName = 'WrappedByAutoSizer';

export const WrappedByAutoSizer = React.memo(WrappedByAutoSizerComponent);

export enum SeriesType {
  BAR = 'bar',
  AREA = 'area',
  LINE = 'line',
}

// Apply margins and paddings: https://ela.st/charts-spacing
const theme: PartialTheme = {
  chartMargins: {
    left: 0,
    right: 0,
    // Apply some paddings to the top to avoid chopping the y tick https://ela.st/chopping-edge
    top: 4,
    bottom: 0,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: {
    barsPadding: 0.05,
  },
};
export const useTheme = () => {
  const isDarkMode = useUiSetting<boolean>(DEFAULT_DARK_MODE);
  const defaultTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const themeValue = useMemo(() => mergeWithDefaultTheme(theme, defaultTheme), []);

  return themeValue;
};

export const chartDefaultSettings = {
  rotation: chartDefaultRotation,
  rendering: chartDefaultRendering,
  animatedData: false,
  showLegend: false,
  showLegendExtra: false,
  debug: false,
  legendPosition: Position.Bottom,
};

export const getChartHeight = (customHeight?: number, autoSizerHeight?: number): string => {
  const height = customHeight || autoSizerHeight;
  return height ? `${height}px` : defaultChartHeight;
};

export const getChartWidth = (customWidth?: number, autoSizerWidth?: number): string => {
  const height = customWidth || autoSizerWidth;
  return height ? `${height}px` : defaultChartWidth;
};

export const checkIfAllValuesAreZero = (data: ChartSeriesData[] | null | undefined): boolean =>
  Array.isArray(data) &&
  data.every((series) => {
    return Array.isArray(series.value) && (series.value as ChartData[]).every(({ y }) => y === 0);
  });
