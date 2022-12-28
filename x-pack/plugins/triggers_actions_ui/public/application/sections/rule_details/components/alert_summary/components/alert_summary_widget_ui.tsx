/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useMemo } from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
  EUI_SPARKLINE_THEME_PARTIAL,
} from '@elastic/eui/dist/eui_charts_theme';
import { LineSeries, Chart, CurveType, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, AlertStatus } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsSummaryWidgetUIProps } from './types';

export const AlertsSummaryWidgetUI = ({
  activeAlertCount,
  activeAlerts,
  recoveredAlertCount,
  recoveredAlerts,
  timeRangeTitle,
  onClick,
}: AlertsSummaryWidgetUIProps) => {
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const handleClick = (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => {
    event.preventDefault();
    event.stopPropagation();

    onClick(status);
  };

  const theme = useMemo(
    () => [
      EUI_SPARKLINE_THEME_PARTIAL,
      {
        ...(isDarkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme),
        chartMargins: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
    ],
    [isDarkMode]
  );

  return (
    <EuiPanel
      element="div"
      data-test-subj="alertSummaryWidget"
      hasShadow={false}
      hasBorder
      onClick={handleClick}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5 data-test-subj="totalAlertsCount">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
                defaultMessage="Alerts"
              />
              &nbsp;({activeAlertCount + recoveredAlertCount})
            </h5>
          </EuiTitle>
          {!!timeRangeTitle && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" data-test-subj="timeRangeTitle">
                {timeRangeTitle}
              </EuiText>
            </>
          )}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup>
            {/* Active */}
            <EuiFlexItem>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_ACTIVE)
                }
              >
                <EuiFlexGroup alignItems={'center'} responsive={false}>
                  <EuiFlexItem grow={1} style={{ minWidth: '70px' }}>
                    <EuiText color={euiLightVars.euiTextColor}>
                      <h3 data-test-subj="activeAlertsCount">{activeAlertCount}</h3>
                    </EuiText>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
                        defaultMessage="Active"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={3}>
                    <Chart size={{ height: 50 }}>
                      <Settings theme={theme} tooltip={{ type: 'none' }} />
                      <LineSeries
                        id="active"
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor="key"
                        yAccessors={['doc_count']}
                        data={activeAlerts}
                        lineSeriesStyle={{
                          line: {
                            strokeWidth: 2,
                            stroke: '#E7664C',
                          },
                        }}
                        curve={CurveType.CURVE_MONOTONE_X}
                      />
                    </Chart>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiLink>
            </EuiFlexItem>
            {/* Recovered */}
            <EuiFlexItem>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_RECOVERED)
                }
              >
                <EuiFlexGroup alignItems={'center'} responsive={false}>
                  <EuiFlexItem grow={1} style={{ minWidth: '70px' }}>
                    <EuiText color={euiLightVars.euiTextColor}>
                      <h3 data-test-subj="recoveredAlertsCount">{recoveredAlertCount}</h3>
                    </EuiText>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredLabel"
                        defaultMessage="Recovered"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={3}>
                    <Chart size={{ height: 50 }}>
                      <Settings theme={theme} tooltip={{ type: 'none' }} />
                      <LineSeries
                        id="recovered"
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor="key"
                        yAccessors={['doc_count']}
                        data={recoveredAlerts}
                        curve={CurveType.CURVE_MONOTONE_X}
                      />
                    </Chart>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
