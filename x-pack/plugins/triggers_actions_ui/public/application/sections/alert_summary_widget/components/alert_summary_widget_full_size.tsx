/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertCounts } from './alert_counts';
import { ALL_ALERT_COLOR, TOOLTIP_DATE_FORMAT } from './constants';
import { Alert, ChartProps, DependencyProps } from '../types';

export interface AlertSummaryWidgetFullSizeProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  chartProps?: ChartProps;
  recoveredAlertCount: number;
  timeZone: string;
  dateFormat?: string;
  hideChart?: boolean;
  hideStats?: boolean;
  dependencyProps: DependencyProps;
}

export const AlertSummaryWidgetFullSize = ({
  activeAlertCount,
  activeAlerts,
  chartProps: { themeOverrides, onBrushEnd } = {},
  dateFormat,
  recoveredAlertCount,
  timeZone,
  hideChart,
  hideStats,
  dependencyProps: { baseTheme },
}: AlertSummaryWidgetFullSizeProps) => {
  const chartData = activeAlerts.map((alert) => alert.doc_count);
  const domain = {
    max: Math.max(...chartData) * 1.1, // add 10% headroom
    min: Math.min(...chartData) * 0.9, // add 10% floor
  };

  return (
    <EuiPanel
      element="div"
      data-test-subj="alertSummaryWidgetFullSize"
      hasShadow={false}
      paddingSize="none"
    >
      {!hideStats && (
        <EuiFlexItem data-test-subj="alertSummaryWidgetFullSizeStats">
          <AlertCounts
            activeAlertCount={activeAlertCount}
            recoveredAlertCount={recoveredAlertCount}
          />
        </EuiFlexItem>
      )}
      {!hideChart && (
        <div data-test-subj="alertSummaryWidgetFullSizeChartContainer">
          <EuiSpacer size="l" />
          <Chart size={['100%', 170]}>
            <Tooltip
              headerFormatter={(tooltip) =>
                moment(tooltip.value).format(dateFormat || TOOLTIP_DATE_FORMAT)
              }
            />
            <Settings
              legendPosition={Position.Right}
              theme={[
                ...(themeOverrides
                  ? Array.isArray(themeOverrides)
                    ? themeOverrides
                    : [themeOverrides]
                  : []),
                {
                  chartPaddings: {
                    top: 7,
                  },
                },
              ]}
              baseTheme={baseTheme}
              onBrushEnd={onBrushEnd}
              locale={i18n.getLocale()}
            />
            <Axis
              id="bottom"
              position={Position.Bottom}
              timeAxisLayerCount={2}
              gridLine={{
                visible: true,
              }}
              style={{
                tickLine: { size: 0, padding: 4 },
                tickLabel: { alignment: { horizontal: Position.Left, vertical: Position.Bottom } },
              }}
            />
            <Axis
              id="left"
              position={Position.Left}
              gridLine={{ visible: true }}
              integersOnly
              ticks={4}
              domain={domain}
            />
            <Axis
              id="right"
              position={Position.Right}
              gridLine={{ visible: true }}
              integersOnly
              ticks={4}
            />
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
              timeZone={timeZone}
            />
          </Chart>
        </div>
      )}
    </EuiPanel>
  );
};
