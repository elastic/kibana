/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AreaSeries, Chart, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTextColor } from '@elastic/eui';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
  EUI_SPARKLINE_THEME_PARTIAL,
} from '@elastic/eui/dist/eui_charts_theme';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import type { NumberOrNull } from '../../../../typings/fetch_overview_data';

interface Props {
  id: string;
  value: NumberOrNull;
  timeseries: any[];
  formatter: (value: NumberOrNull) => string;
  color: number;
}
export function MetricWithSparkline({ id, formatter, value, timeseries, color }: Props) {
  const themeCTX = useContext(ThemeContext);
  const isDarkTheme = (themeCTX && themeCTX.darkMode) || false;
  const theme = [
    EUI_SPARKLINE_THEME_PARTIAL,
    isDarkTheme ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme,
  ];

  const colors = theme[1].colors?.vizColors ?? [];

  if (!value) {
    return (
      <EuiTextColor color="subdued">
        <EuiIcon type="visLine" />
        &nbsp;N/A
      </EuiTextColor>
    );
  }
  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <Chart size={{ height: 18, width: 40 }}>
          <Settings theme={theme} showLegend={false} tooltip="none" />
          <AreaSeries
            id={id}
            data={timeseries}
            xAccessor={'timestamp'}
            yAccessors={[id]}
            color={colors[color] || '#006BB4'}
          />
        </Chart>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {formatter(value)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
