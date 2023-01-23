/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';
import { ALERT_STATUS_ACTIVE, AlertStatus } from '@kbn/rule-data-utils';
import { ACTIVE_ALERT_LABEL, ALERTS_LABEL, WIDGET_TITLE } from './constants';
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
          <EuiFlexGroup gutterSize="l" responsive={false}>
            <EuiFlexItem style={{ minWidth: 50, wordWrap: 'break-word' }} grow={false}>
              <EuiText color={euiTheme.colors.primaryText}>
                <h3 data-test-subj="totalAlertsCount">{activeAlertCount + recoveredAlertCount}</h3>
              </EuiText>
              <EuiText size="s" color="subdued">
                {ALERTS_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 50, wordWrap: 'break-word' }} grow={false}>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_ACTIVE)
                }
                data-test-subj="activeAlerts"
              >
                <EuiText
                  color={
                    !!activeAlertCount ? euiTheme.colors.dangerText : euiTheme.colors.successText
                  }
                >
                  <h3 data-test-subj={`activeAlertsCount`}>
                    {activeAlertCount}
                    {!!activeAlertCount && (
                      <>
                        &nbsp;
                        <EuiIcon type="alert" ascent={10} />
                      </>
                    )}
                  </h3>
                </EuiText>
                <EuiText size="s" color="subdued">
                  {ACTIVE_ALERT_LABEL}
                </EuiText>
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
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
                      stroke: euiTheme.colors.primaryText,
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
