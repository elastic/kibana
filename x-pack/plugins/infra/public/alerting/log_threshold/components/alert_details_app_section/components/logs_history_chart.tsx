/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React from 'react';
import { Rule } from '@kbn/alerting-plugin/common';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TopAlert } from '@kbn/observability-plugin/public';
import { type PartialCriterion } from '../../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../../expression_editor/criterion_preview_chart';
import { PartialRuleParams } from '../../../../../../common/alerting/logs/log_threshold';

const LogsHistoryChart = ({ rule, alert }: { rule: Rule<PartialRuleParams>; alert: TopAlert }) => {
  // Show the Logs History Chart ONLY if we have one criteria
  // So always pull the first criteria
  const criteria = rule.params.criteria[0];
  const dateNow = Date.now();
  const dateLast30Days = Number(moment(dateNow).subtract(30, 'days').format('x'));
  
  const ruleGroupBy =  rule.params.groupBy
  return (
    <>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {/* {serviceName} */}
                {i18n.translate('xpack.infra.logsChartHistory.chartTitle', {
                  defaultMessage: 'Logs alerts history',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.infra.logsChartHistory.last30days', {
                defaultMessage: 'Last 30 days',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" direction="column">
              <EuiFlexItem grow={false}>
                <EuiText color="danger">
                  <EuiTitle size="s">
                    <h3>{}</h3>
                  </EuiTitle>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.infra.logsChartHistory.alertsTriggered', {
                    defaultMessage: 'Alerts triggered',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTitle size="s">
                  <h3>
                    {/* {triggeredAlertsData?.avgTimeToRecoverUS
                        ? convertTo({
                            unit: 'minutes',
                            microseconds: triggeredAlertsData?.avgTimeToRecoverUS,
                            extended: true,
                          }).formatted
                        : '-'} */}
                  </h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.infra.logsChartHistory.avgTimeToRecover', {
                  defaultMessage: 'Avg time to recover',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <CriterionPreview
          ruleParams={rule.params}
          sourceId={rule.params.logView.logViewId}
          chartCriterion={criteria as PartialCriterion}
          showThreshold={true}
          executionTimeRange={{ gte: dateLast30Days, lte: dateNow }}
        />
      </EuiPanel>
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export default LogsHistoryChart;
