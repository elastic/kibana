/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { Color } from '@elastic/charts/dist/common/colors';
import { ColorVariant } from '@elastic/charts/dist/utils/common';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupItemProps,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';
import React from 'react';
import { Alert, ChartThemes } from '../types';

interface AlertStateInfoProps {
  chartThemes: ChartThemes;
  count: number;
  data: Alert[];
  dataTestSubj: string;
  domain: { min: number; max: number };
  id: string;
  stroke: Color | ColorVariant;
  title: EuiListGroupItemProps['label'];
}

export const AlertStateInfo = ({
  count,
  data,
  dataTestSubj,
  domain,
  id,
  stroke,
  chartThemes: { theme, baseTheme },
  title,
}: AlertStateInfoProps) => {
  const { euiTheme } = useEuiTheme();
  const chartTheme = [
    theme,
    EUI_SPARKLINE_THEME_PARTIAL,
    {
      chartMargins: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
  ];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={1} style={{ minWidth: '70px' }}>
        <EuiText color={euiTheme.colors.text}>
          <h3 data-test-subj={`${dataTestSubj}Count`}>{count}</h3>
        </EuiText>
        <EuiText size="s" color="subdued">
          {title}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <Chart size={{ height: 50 }}>
          <Settings theme={chartTheme} baseTheme={baseTheme} tooltip={{ type: 'none' }} />
          <Axis
            domain={domain}
            hide
            id={id + '-axis'}
            position={Position.Left}
            showGridLines={false}
          />
          <LineSeries
            id={id}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="key"
            yAccessors={['doc_count']}
            data={data}
            lineSeriesStyle={{
              line: {
                strokeWidth: 2,
                stroke,
              },
            }}
            curve={CurveType.CURVE_MONOTONE_X}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
