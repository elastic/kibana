/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  ScaleType,
  Chart,
  Settings,
  AreaSeries,
  CurveType,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { px } from '../../../../style/variables';
import { useChartTheme } from '../../../../../../observability/public';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';

interface Props {
  color: string;
  series: Array<{ x: number; y: number | null }>;
}

export function SparkPlot(props: Props) {
  const { series, color } = props;
  const chartTheme = useChartTheme();

  const isEmpty = series.every((point) => point.y === null);

  if (isEmpty) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="visLine" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {NOT_AVAILABLE_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Chart size={{ height: px(24), width: px(64) }}>
      <Settings
        theme={{
          ...chartTheme,
          background: {
            ...chartTheme.background,
            color: 'transparent',
          },
        }}
        showLegend={false}
        tooltip="none"
      />
      <AreaSeries
        id="area"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        data={series}
        color={color}
        curve={CurveType.CURVE_MONOTONE_X}
      />
    </Chart>
  );
}
