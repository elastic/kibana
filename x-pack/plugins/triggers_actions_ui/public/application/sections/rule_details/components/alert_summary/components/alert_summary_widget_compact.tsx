/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';
import { AlertStatus } from '@kbn/rule-data-utils';
import { AlertCounts } from './alert_counts';
import { ALL_ALERT_COLOR, WIDGET_TITLE } from './constants';
import { Alert, ChartThemes } from '../types';

export interface AlertsSummaryWidgetCompactProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  chartThemes: ChartThemes;
  recoveredAlertCount: number;
  timeRangeTitle?: JSX.Element | string;
  onClick: (status?: AlertStatus) => void;
}

export const AlertsSummaryWidgetCompact = ({
  activeAlertCount,
  activeAlerts,
  chartThemes: { theme, baseTheme },
  recoveredAlertCount,
  timeRangeTitle,
  onClick,
}: AlertsSummaryWidgetCompactProps) => {
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

  const handleClick = (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => {
    event.preventDefault();
    event.stopPropagation();

    onClick(status);
  };

  return (
    <EuiPanel
      element="div"
      data-test-subj="alertSummaryWidgetCompact"
      hasShadow={false}
      hasBorder
      onClick={handleClick}
    >
      <EuiFlexGroup direction="column">
        {!!timeRangeTitle && (
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h5>{WIDGET_TITLE}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued" data-test-subj="timeRangeTitle">
              {timeRangeTitle}
            </EuiText>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <AlertCounts
            activeAlertCount={activeAlertCount}
            recoveredAlertCount={recoveredAlertCount}
            onActiveClick={handleClick}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ minWidth: '200px' }}>
              <Chart size={{ height: 50 }}>
                <Settings theme={chartTheme} baseTheme={baseTheme} tooltip={{ type: 'none' }} />
                <Axis hide id={'activeAlertsAxis'} position={Position.Left} showGridLines={false} />
                <LineSeries
                  id={'activeAlertsChart'}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="key"
                  yAccessors={['doc_count']}
                  data={activeAlerts}
                  lineSeriesStyle={{
                    line: {
                      strokeWidth: 2,
                      stroke: ALL_ALERT_COLOR,
                    },
                  }}
                  curve={CurveType.CURVE_MONOTONE_X}
                />
              </Chart>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
