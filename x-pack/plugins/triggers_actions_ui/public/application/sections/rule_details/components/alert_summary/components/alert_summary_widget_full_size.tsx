/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { AlertCounts } from './alert_counts';
import { ALL_ALERT_COLOR, TOOLTIP_DATE_FORMAT } from './constants';
import { Alert, ChartThemes } from '../types';

export interface AlertsSummaryWidgetFullSizeProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  chartThemes: ChartThemes;
  recoveredAlertCount: number;
  dateFormat?: string;
}

export const AlertsSummaryWidgetFullSize = ({
  activeAlertCount,
  activeAlerts,
  chartThemes: { theme, baseTheme },
  dateFormat,
  recoveredAlertCount,
}: AlertsSummaryWidgetFullSizeProps) => {
  const chartTheme = [
    theme,
    {
      chartPaddings: {
        top: 7,
      },
    },
  ];

  return (
    <EuiPanel
      element="div"
      data-test-subj="alertSummaryWidgetFullSize"
      hasShadow={false}
      paddingSize="none"
    >
      <EuiFlexItem>
        <AlertCounts
          activeAlertCount={activeAlertCount}
          recoveredAlertCount={recoveredAlertCount}
        />
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <Chart size={['100%', 170]}>
        <Settings
          legendPosition={Position.Right}
          theme={chartTheme}
          baseTheme={baseTheme}
          tooltip={{
            headerFormatter: (tooltip) =>
              moment(tooltip.value).format(dateFormat || TOOLTIP_DATE_FORMAT),
          }}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          timeAxisLayerCount={2}
          showGridLines
          style={{
            tickLine: { size: 0.0001, padding: 4 },
            tickLabel: { alignment: { horizontal: Position.Left, vertical: Position.Bottom } },
          }}
        />
        <Axis id="left" position={Position.Left} showGridLines integersOnly ticks={4} />
        <Axis id="right" position={Position.Right} showGridLines integersOnly ticks={4} />
        <LineSeries
          id="Active"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['doc_count']}
          color={[ALL_ALERT_COLOR]}
          data={activeAlerts}
          lineSeriesStyle={{
            line: {
              strokeWidth: 2,
            },
            point: { visible: false },
          }}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      </Chart>
    </EuiPanel>
  );
};
