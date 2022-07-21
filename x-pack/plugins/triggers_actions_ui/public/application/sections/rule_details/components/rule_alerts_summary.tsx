/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  PartialTheme,
  TooltipType,
  LIGHT_THEME,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { Rule } from '../../../../types';
import {
  AlertChartData,
  useLoadRuleAlertsAggs,
} from '../../../hooks/use_load_rule_alerts_aggregations';
import { useLoadRuleTypes } from '../../../hooks/use_load_rule_types';
export interface RuleAlertsSummaryProps {
  rule: Rule;
  filteredRuleTypes: string[];
}
const getColorSeries = ({ seriesKeys }: XYChartSeriesIdentifier) => {
  switch (seriesKeys[0]) {
    case 'active':
      return LIGHT_THEME.colors.vizColors[1];
    case 'recovered':
      return LIGHT_THEME.colors.vizColors[2];
    default:
      return null;
  }
};

export const RuleAlertsSummary = ({ rule, filteredRuleTypes }: RuleAlertsSummaryProps) => {
  const [features, setFeatures] = useState<string>('');
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });
  const {
    ruleAlertsAggs: { active, recovered },
    isLoadingRuleAlertsAggs,
    errorRuleAlertsAggs,
    alertsChartData,
  } = useLoadRuleAlertsAggs({
    ruleId: rule.id,
    features,
  });
  useEffect(() => {
    const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);
    if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
      setFeatures(matchedRuleType.producer);
    } else setFeatures(rule.consumer);
  }, [rule, ruleTypes]);

  if (isLoadingRuleAlertsAggs) return <EuiLoadingSpinner />;
  if (errorRuleAlertsAggs) return <EuiFlexItem>Error</EuiFlexItem>;

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.alertsTitle"
                    defaultMessage="Alerts"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiPanel hasShadow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.allAlertsTitle"
                        defaultMessage="All alerts"
                      />
                    </EuiText>
                    <EuiText>
                      <h4>{active + recovered}</h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.activeTitle"
                        defaultMessage="Active"
                      />
                    </EuiText>
                    <EuiText color="#4A7194">
                      <h4>{active}</h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredTitle"
                        defaultMessage="Recovered"
                      />
                    </EuiText>
                    <EuiFlexItem>
                      <EuiText color="#C4407C">
                        <h4>{recovered}</h4>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiHorizontalRule margin="none" />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recentAlertHistoryTitle"
                defaultMessage="Recent alert history"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {AlertsChart({ data: alertsChartData })}
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertsSummary as default };
interface AlertsChartProps {
  data: AlertChartData[];
}
const AlertsChart = ({ data }: AlertsChartProps) => {
  const theme: PartialTheme = {
    chartMargins: {
      bottom: 0,
      left: 0,
      top: 20,
      right: 0,
    },
    chartPaddings: {
      bottom: 0,
      left: 0,
      top: 0,
      right: 0,
    },
  };

  return (
    <Chart size={['100%', '35%']}>
      <Settings tooltip={TooltipType.None} theme={theme} />
      <BarSeries
        id="bars"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        stackAccessors={['x']}
        splitSeriesAccessors={['g']}
        color={getColorSeries}
        data={data.map((alert) => ({
          x: alert.date,
          y: alert.count,
          g: alert.status,
        }))}
      />
    </Chart>
  );
};
