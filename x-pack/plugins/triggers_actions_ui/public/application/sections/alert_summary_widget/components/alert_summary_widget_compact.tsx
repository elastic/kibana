/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  TooltipType,
  Tooltip,
} from '@elastic/charts';
import { AlertStatus } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { AlertCounts } from './alert_counts';
import { ALL_ALERT_COLOR, WIDGET_TITLE } from './constants';
import { Alert, ChartProps, DependencyProps } from '../types';

export interface AlertSummaryWidgetCompactProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  chartProps?: ChartProps;
  recoveredAlertCount: number;
  timeRangeTitle?: JSX.Element | string;
  onClick: (status?: AlertStatus) => void;
  dependencyProps: DependencyProps;
}

export const AlertSummaryWidgetCompact = ({
  activeAlertCount,
  activeAlerts,
  chartProps: { themeOverrides } = {},
  recoveredAlertCount,
  timeRangeTitle,
  onClick,
  dependencyProps: { baseTheme, sparklineTheme },
}: AlertSummaryWidgetCompactProps) => {
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
                <Tooltip type={TooltipType.None} />
                <Settings
                  theme={[
                    ...(themeOverrides
                      ? Array.isArray(themeOverrides)
                        ? themeOverrides
                        : [themeOverrides]
                      : []),
                    sparklineTheme,
                    {
                      chartMargins: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10,
                      },
                    },
                  ]}
                  baseTheme={baseTheme}
                  locale={i18n.getLocale()}
                />
                <Axis
                  hide
                  id="activeAlertsAxis"
                  position={Position.Left}
                  gridLine={{
                    visible: false,
                  }}
                />
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
