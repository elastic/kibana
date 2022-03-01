/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  DARK_THEME,
  Datum,
  LIGHT_THEME,
  PartialTheme,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import styled from 'styled-components';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { ChartWrapper } from '../chart_wrapper';
import { I18LABELS } from '../translations';

const StyleChart = styled.div`
  height: 100%;
`;

interface Props {
  options?: Array<{
    count: number;
    name: string;
  }>;
  loading: boolean;
}

const theme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  legend: {
    verticalWidth: 100,
  },
  partition: {
    linkLabel: { maximumSection: Infinity, maxCount: 0 },
    outerSizeRatio: 1, // - 0.5 * Math.random(),
    circlePadding: 4,
  },
};

export function VisitorBreakdownChart({ loading, options }: Props) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const euiChartTheme = darkMode
    ? EUI_CHARTS_THEME_DARK
    : EUI_CHARTS_THEME_LIGHT;

  return (
    <ChartWrapper loading={loading} height="245px" maxWidth="430px">
      <StyleChart>
        <Chart>
          <Settings
            showLegend
            baseTheme={darkMode ? DARK_THEME : LIGHT_THEME}
            theme={theme}
          />
          <Partition
            id="spec_1"
            data={
              options?.length ? options : [{ count: 1, name: I18LABELS.noData }]
            }
            layout={PartitionLayout.sunburst}
            clockwiseSectors={false}
            valueAccessor={(d: Datum) => d.count as number}
            valueGetter="percent"
            percentFormatter={(d: number) =>
              `${Math.round((d + Number.EPSILON) * 100) / 100}%`
            }
            layers={[
              {
                groupByRollup: (d: Datum) => d.name,
                shape: {
                  fillColor: (d) =>
                    euiChartTheme.theme.colors?.vizColors?.[d.sortIndex]!,
                },
              },
            ]}
          />
        </Chart>
      </StyleChart>
    </ChartWrapper>
  );
}
