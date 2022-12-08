/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrushEndListener, ElementClickListener, Rotation } from '@elastic/charts';
import { ScaleType } from '@elastic/charts';
import styled from 'styled-components';

import { get, getOr } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
  UserskKpiStrategyResponse,
} from '../../../../common/search_strategy';
import type { ChartSeriesData, ChartData } from '../../../common/components/charts/common';

import type { StatItem } from './types';

export const ChartHeight = '120px';

export const FlexGroup = styled(EuiFlexGroup)`
  .no-margin {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`;
export const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
  position: relative;
`;

FlexItem.displayName = 'FlexItem';

export const MetricItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex-basis: 0;
    flex-grow: 0;
  }
`;
MetricItem.displayName = 'MetricItem';

export const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

StatValue.displayName = 'StatValue';

export const StyledTitle = styled.h6`
  line-height: 200%;
`;

export const numberFormatter = (value: string | number): string => value.toLocaleString();
export const statItemBarchartRotation: Rotation = 90;
export const statItemChartCustomHeight = 74;

export const areachartConfigs = (config?: {
  xTickFormatter: (value: number) => string;
  onBrushEnd?: BrushEndListener;
}) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: get('xTickFormatter', config),
    yTickFormatter: numberFormatter,
  },
  settings: {
    onBrushEnd: getOr(() => {}, 'onBrushEnd', config),
  },
  customHeight: statItemChartCustomHeight,
});

export const barchartConfigs = (config?: { onElementClick?: ElementClickListener }) => ({
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['y0'],
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
  settings: {
    onElementClick: getOr(() => {}, 'onElementClick', config),
    rotation: statItemBarchartRotation,
  },
  customHeight: statItemChartCustomHeight,
});

export const addValueToFields = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): StatItem[] => fields.map((field) => ({ ...field, value: get(field.key, data) }));

export const addValueToAreaChart = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): ChartSeriesData[] =>
  fields
    .filter((field) => get(`${field.key}Histogram`, data) != null)
    .map(({ lensAttributes, ...field }) => ({
      ...field,
      value: get(`${field.key}Histogram`, data),
      key: `${field.key}Histogram`,
    }));

export const addValueToBarChart = (
  fields: StatItem[],
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse
): ChartSeriesData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: ChartSeriesData[], field: StatItem, idx: number) => {
    const { key, color } = field;
    const y: number | null = getOr(null, key, data);
    const x: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);
    const value: [ChartData] = [
      {
        x,
        y,
        g: key,
        y0: 0,
      },
    ];

    return [
      ...acc,
      {
        key,
        color,
        value,
      },
    ];
  }, []);
};
