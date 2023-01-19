/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import {
  ACTIVE_ALERT_LABEL,
  ACTIVE_COLOR,
  ALL_ALERT_LABEL,
  RECOVERED_ALERT_LABEL,
  RECOVERED_COLOR,
  TOOLTIP_DATE_FORMAT,
} from './constants';
import { Alert, ChartTheme } from '../types';

export interface AlertsSummaryWidgetFullSizeProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  chartThemes: ChartTheme;
  recoveredAlertCount: number;
  recoveredAlerts: Alert[];
  dateFormat?: string;
}

export const AlertsSummaryWidgetFullSize = ({
  activeAlertCount,
  activeAlerts,
  chartThemes: { theme, baseTheme },
  dateFormat,
  recoveredAlertCount,
  recoveredAlerts,
}: AlertsSummaryWidgetFullSizeProps) => {
  const { euiTheme } = useEuiTheme();
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
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xl" alignItems="flexStart" responsive={false}>
                <EuiFlexItem>
                  <EuiText color={euiTheme.colors.text}>
                    <h3 data-test-subj="totalAlertsCount">
                      {activeAlertCount + recoveredAlertCount}
                    </h3>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {ALL_ALERT_LABEL}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color={euiTheme.colors.dangerText}>
                    <h3 data-test-subj="activeAlertsCount">{activeAlertCount}</h3>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {ACTIVE_ALERT_LABEL}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color={euiTheme.colors.successText}>
                      <h3 data-test-subj="recoveredAlertsCount">{recoveredAlertCount}</h3>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {RECOVERED_ALERT_LABEL}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <Chart size={['100%', 170]}>
        <Settings
          showLegend
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
          data={activeAlerts}
          color={[ACTIVE_COLOR]}
          lineSeriesStyle={{
            line: {
              strokeWidth: 2,
            },
            point: { visible: true, radius: 3, strokeWidth: 2 },
          }}
          curve={CurveType.CURVE_MONOTONE_X}
          timeZone="UTC"
        />
        <LineSeries
          id="Recovered"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['doc_count']}
          data={recoveredAlerts}
          color={[RECOVERED_COLOR]}
          lineSeriesStyle={{
            line: {
              strokeWidth: 2,
            },
            point: { visible: true, radius: 3, strokeWidth: 2 },
          }}
          curve={CurveType.CURVE_MONOTONE_X}
          timeZone="UTC"
        />
      </Chart>
    </EuiPanel>
  );
};
