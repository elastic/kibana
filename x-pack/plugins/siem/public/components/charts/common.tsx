/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiText, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import {
  CustomSeriesColorsMap,
  DataSeriesColorsValues,
  getSpecId,
  mergeWithDefaultTheme,
  PartialTheme,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';

const chartHeight = 74;
const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const ChartHolder = () => (
  <FlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText size="s" textAlign="center" color="subdued">
        {i18n.translate('xpack.siem.chart.dataNotAvailableTitle', {
          defaultMessage: 'Chart Data Not Available',
        })}
      </EuiText>
    </EuiFlexItem>
  </FlexGroup>
);

export interface ChartData {
  x: number | string | null;
  y: number | string | null;
  y0?: number;
  g?: number | string;
}

export interface ChartConfigsData {
  key: string;
  value: ChartData[] | [] | null;
  color?: string | undefined;
}

export const WrappedByAutoSizer = styled.div`
  height: ${chartHeight}px;
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

export const numberFormatter = (value: string | number) => {
  return value.toLocaleString && value.toLocaleString();
};

export enum SeriesType {
  BAR = 'bar',
  AREA = 'area',
  LINE = 'line',
}

// Customize colors: https://ela.st/custom-colors
export const getSeriesStyle = (
  seriesKey: string,
  color: string | undefined,
  seriesType?: SeriesType
) => {
  if (!color) return undefined;
  const customSeriesColors: CustomSeriesColorsMap = new Map();
  const dataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: seriesType === SeriesType.BAR ? [seriesKey] : [],
    specId: getSpecId(seriesKey),
  };

  customSeriesColors.set(dataSeriesColorValues, color);

  return customSeriesColors;
};

// Apply margins and paddings: https://ela.st/charts-spacing
export const getTheme = () => {
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
      barsPadding: 0.5,
    },
  };
  return mergeWithDefaultTheme(theme);
};
