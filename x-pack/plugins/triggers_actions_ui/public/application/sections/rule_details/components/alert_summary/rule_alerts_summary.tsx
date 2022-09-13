/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BarSeries,
  Chart,
  FilterPredicate,
  LIGHT_THEME,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
  EUI_SPARKLINE_THEME_PARTIAL,
} from '@elastic/eui/dist/eui_charts_theme';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import { useLoadRuleAlertsAggs } from '../../../../hooks/use_load_rule_alerts_aggregations';
import { useLoadRuleTypes } from '../../../../hooks/use_load_rule_types';
import { formatChartAlertData, getColorSeries } from '.';
import { RuleAlertsSummaryProps } from '.';
import { isP1DTFormatterSetting } from './helpers';

const Y_ACCESSORS = ['y'];
const X_ACCESSORS = ['x'];
const G_ACCESSORS = ['g'];
const FALLBACK_DATE_FORMAT_SCALED_P1DT = 'YYYY-MM-DD';
export const RuleAlertsSummary = ({ rule, filteredRuleTypes }: RuleAlertsSummaryProps) => {
  const [features, setFeatures] = useState<string>('');
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');

  const scaledDateFormatPreference = useUiSetting<string[][]>('dateFormat:scaled');
  const maybeP1DTFormatter = Array.isArray(scaledDateFormatPreference)
    ? scaledDateFormatPreference.find(isP1DTFormatterSetting)
    : null;
  const p1dtFormat =
    Array.isArray(maybeP1DTFormatter) && maybeP1DTFormatter.length === 2
      ? maybeP1DTFormatter[1]
      : FALLBACK_DATE_FORMAT_SCALED_P1DT;

  const theme = useMemo(
    () => [
      EUI_SPARKLINE_THEME_PARTIAL,
      isDarkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme,
    ],
    [isDarkMode]
  );
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
  const chartData = useMemo(() => formatChartAlertData(alertsChartData), [alertsChartData]);
  const tooltipSettings = useMemo(
    () => ({
      type: TooltipType.VerticalCursor,
      headerFormatter: ({ value }: { value: number }) => {
        return <>{moment(value).format(p1dtFormat)}</>;
      },
    }),
    [p1dtFormat]
  );

  useEffect(() => {
    const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);
    if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
      setFeatures(matchedRuleType.producer);
    } else setFeatures(rule.consumer);
  }, [rule, ruleTypes]);

  if (isLoadingRuleAlertsAggs) return <EuiLoadingSpinner />;
  if (errorRuleAlertsAggs)
    return (
      <EuiEmptyPrompt
        data-test-subj="alertsRuleSummaryErrorPrompt"
        iconType="alert"
        color="danger"
        title={
          <h5>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.errorLoadingTitle"
              defaultMessage="Unable to load the alerts summary"
            />
          </h5>
        }
        body={
          <p>
            {
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.errorLoadingBody"
                defaultMessage=" There was an error loading the alerts summary. Contact your
                administrator for help."
              />
            }
          </p>
        }
      />
    );
  const isVisibleFunction: FilterPredicate = (series) => series.splitAccessors.get('g') !== 'total';
  return (
    <EuiPanel data-test-subj="ruleAlertsSummary" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
                    defaultMessage="Alerts"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.last30days"
                  defaultMessage="Last 30 days"
                />
              </EuiText>
            </EuiFlexItem>

            <EuiPanel hasShadow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.allAlertsLabel"
                        defaultMessage="All alerts"
                      />
                    </EuiText>
                    <EuiText>
                      <h4 data-test-subj="totalAlertsCount">{active + recovered}</h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
                        defaultMessage="Active"
                      />
                    </EuiText>
                    <EuiText color={LIGHT_THEME.colors.vizColors[2]}>
                      <h4 data-test-subj="activeAlertsCount">{active}</h4>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredLabel"
                        defaultMessage="Recovered"
                      />
                    </EuiText>
                    <EuiFlexItem>
                      <EuiText color={LIGHT_THEME.colors.vizColors[1]}>
                        <h4 data-test-subj="recoveredAlertsCount">{recovered}</h4>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.recentAlertHistoryTitle"
                defaultMessage="Recent alert history"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <Chart size={{ height: 50 }}>
        <Settings tooltip={tooltipSettings} theme={theme} />
        <BarSeries
          id="bars"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={Y_ACCESSORS}
          stackAccessors={X_ACCESSORS}
          splitSeriesAccessors={G_ACCESSORS}
          color={getColorSeries}
          data={chartData}
          filterSeriesInTooltip={isVisibleFunction}
        />
      </Chart>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertsSummary as default };
