/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  useEuiTheme,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_GROUP, ALERT_INSTANCE_ID, type AlertConsumers } from '@kbn/rule-data-utils';
import { useAlertsHistory } from '@kbn/observability-alert-details';
import { convertTo } from '../../../../../common/utils/formatters';
import { getGroupFilters } from '../../../../../common/custom_threshold_rule/helpers/get_group';
import { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../../utils/kibana_react';
import { AlertParams } from '../../types';
import { RuleConditionChart } from '../rule_condition_chart/rule_condition_chart';
import { CustomThresholdAlert, CustomThresholdRule } from '../types';
import { generateChartTitleAndTooltip } from './helpers/generate_chart_title_and_tooltip';

const DEFAULT_INTERVAL = '1d';
const SERIES_TYPE = 'bar_stacked';

interface Props {
  alert: CustomThresholdAlert;
  rule: CustomThresholdRule;
  dataView?: DataView;
}

const dateRange = {
  from: 'now-30d',
  to: 'now+1d',
};

export function AlertHistoryChart({ rule, dataView, alert }: Props) {
  const { http, notifications } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const ruleParams = rule.params as RuleTypeParams & AlertParams;
  const groups = alert.fields[ALERT_GROUP];
  const instanceId = alert.fields[ALERT_INSTANCE_ID];
  const featureIds = [rule.consumer as AlertConsumers];
  const options = rule.params.criteria.map((criterion, index) => {
    const { title, tooltip } = generateChartTitleAndTooltip(criterion, 27);
    return {
      text: title,
      title: tooltip,
    };
  });
  const [selectedCriterion, setSelectedCriterion] = useState<CustomMetricExpressionParams>(
    rule.params.criteria[0]
  );

  const {
    data: { histogramTriggeredAlerts, avgTimeToRecoverUS, totalTriggeredAlerts },
    isLoading,
    isError,
  } = useAlertsHistory({
    http,
    featureIds,
    ruleId: rule.id,
    dateRange,
    instanceId,
  });

  if (isError) {
    notifications?.toasts.addDanger({
      title: i18n.translate('xpack.observability.customThreshold.alertHistory.error.toastTitle', {
        defaultMessage: 'Alerts history chart error',
      }),
      text: i18n.translate(
        'xpack.observability.customThreshold.alertHistory.error.toastDescription',
        {
          defaultMessage: `An error occurred when fetching alert history chart data`,
        }
      ),
    });
  }

  const annotations: EventAnnotationConfig[] =
    histogramTriggeredAlerts
      ?.filter((annotation) => annotation.doc_count > 0)
      .map((annotation) => {
        return {
          type: 'manual',
          id: uuidv4(),
          label: String(annotation.doc_count),
          key: {
            type: 'point_in_time',
            timestamp: moment(new Date(annotation.key_as_string!))
              .startOf('day')
              .add(12, 'h')
              .toISOString(),
          },
          lineWidth: 2,
          color: euiTheme.colors.danger,
          icon: 'alert',
          textVisibility: true,
        };
      }) || [];

  return (
    <EuiPanel hasBorder={true} data-test-subj="AlertDetails">
      <EuiFlexGroup>
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.observability.customThreshold.alertHistory.chartTitle', {
                  defaultMessage: 'Alerts history',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.observability.customThreshold.alertHistory.last30days', {
                defaultMessage: 'Last 30 days',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {rule.params.criteria.length > 1 && (
          <EuiSelect
            data-test-subj="o11yAlertHistoryChartSelect"
            options={options}
            onChange={(e) =>
              setSelectedCriterion(
                rule.params.criteria[
                  options.map((option) => option.text).indexOf(e.target.value) ?? 0
                ]
              )
            }
          />
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="danger">
                <EuiTitle size="s">
                  <h3>
                    {isLoading ? <EuiLoadingSpinner size="s" /> : totalTriggeredAlerts || '-'}
                  </h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.observability.customThreshold.alertHistory.alertsTriggered',
                  {
                    defaultMessage: 'Alerts triggered',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTitle size="s">
                <h3>
                  {isLoading ? (
                    <EuiLoadingSpinner size="s" />
                  ) : avgTimeToRecoverUS ? (
                    convertTo({
                      unit: 'minutes',
                      microseconds: avgTimeToRecoverUS,
                      extended: true,
                    }).formatted
                  ) : (
                    '-'
                  )}
                </h3>
              </EuiTitle>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.observability.customThreshold.alertHistory.avgTimeToRecover', {
                defaultMessage: 'Avg time to recover',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <RuleConditionChart
        additionalFilters={getGroupFilters(groups)}
        annotations={annotations}
        chartOptions={{
          // For alert details page, the series type needs to be changed to 'bar_stacked'
          // due to https://github.com/elastic/elastic-charts/issues/2323
          seriesType: SERIES_TYPE,
          interval: DEFAULT_INTERVAL,
        }}
        dataView={dataView}
        groupBy={ruleParams.groupBy}
        metricExpression={selectedCriterion}
        searchConfiguration={ruleParams.searchConfiguration}
        timeRange={dateRange}
      />
    </EuiPanel>
  );
}
