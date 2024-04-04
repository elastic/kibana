/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React from 'react';
import { Rule } from '@kbn/alerting-plugin/common';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertTo } from '@kbn/observability-plugin/public';
import { AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import { EuiIcon, EuiBadge } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { AlertConsumers } from '@kbn/rule-data-utils';
import DateMath from '@kbn/datemath';
import { getGroupQueries, useAlertsHistory } from '@kbn/observability-alert-details';
import type { Group } from '@kbn/observability-alert-details';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { type PartialCriterion } from '../../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../../expression_editor/criterion_preview_chart';
import { PartialRuleParams } from '../../../../../../common/alerting/logs/log_threshold';

const LogsHistoryChart = ({
  rule,
  groups,
}: {
  rule: Rule<PartialRuleParams>;
  groups?: Group[];
}) => {
  const { http, notifications } = useKibanaContextForPlugin().services;
  // Show the Logs History Chart ONLY if we have one criteria
  // So always pull the first criteria
  const criteria = rule.params.criteria[0];

  const dateRange = {
    from: 'now-30d',
    to: 'now',
  };
  const executionTimeRange = {
    gte: DateMath.parse(dateRange.from)!.valueOf(),
    lte: DateMath.parse(dateRange.to, { roundUp: true })!.valueOf(),
    buckets: 30,
  };

  const queries = getGroupQueries(groups);
  const {
    data: { histogramTriggeredAlerts, avgTimeToRecoverUS, totalTriggeredAlerts },
    isLoading,
    isError,
  } = useAlertsHistory({
    http,
    featureIds: [AlertConsumers.LOGS],
    ruleId: rule.id,
    dateRange,
    queries,
  });

  if (isError) {
    notifications?.toasts.addDanger({
      title: i18n.translate('xpack.infra.alertDetails.logsAlertHistoryChart.error.toastTitle', {
        defaultMessage: 'Logs alerts history chart error',
      }),
      text: i18n.translate(
        'xpack.infra.alertDetails.logsAlertHistoryChart.error.toastDescription',
        {
          defaultMessage: `An error occurred when fetching logs alert history chart data`,
        }
      ),
    });
  }
  const alertHistoryAnnotations =
    histogramTriggeredAlerts
      ?.filter((annotation) => annotation.doc_count > 0)
      .map((annotation) => {
        return {
          dataValue: annotation.key,
          header: String(annotation.doc_count),
          // Only the date(without time) is needed here, uiSettings don't provide that
          details: moment(annotation.key_as_string).format('yyyy-MM-DD'),
        };
      }) || [];

  return (
    <EuiPanel hasBorder={true} data-test-subj="logsHistoryChartAlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.infra.logs.alertDetails.chartHistory.chartTitle', {
                defaultMessage: 'Logs threshold alerts history',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.infra.logs.alertDetails.chartHistory.last30days', {
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
                  <h3>
                    {isLoading ? <EuiLoadingSpinner size="s" /> : totalTriggeredAlerts || '-'}
                  </h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.infra.logs.alertDetails.chartHistory.alertsTriggered', {
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
              {i18n.translate('xpack.infra.logs.alertDetails.chartHistory.avgTimeToRecover', {
                defaultMessage: 'Avg time to recover',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <CriterionPreview
        annotations={[
          <LineAnnotation
            id="annotations"
            key={'annotationsAlertHistory'}
            domainType={AnnotationDomainType.XDomain}
            dataValues={alertHistoryAnnotations}
            style={{
              line: {
                strokeWidth: 3,
                stroke: euiThemeVars.euiColorDangerText,
                opacity: 1,
              },
            }}
            marker={<EuiIcon type="warning" color="danger" />}
            markerBody={(annotationData) => (
              <>
                <EuiBadge color="danger">
                  <EuiText size="xs" color="white">
                    {annotationData.header}
                  </EuiText>
                </EuiBadge>
                <EuiSpacer size="xs" />
              </>
            )}
            markerPosition={Position.Top}
          />,
        ]}
        ruleParams={{ ...rule.params, timeSize: 1, timeUnit: 'd' }}
        logViewReference={rule.params.logView}
        chartCriterion={criteria as PartialCriterion}
        showThreshold={true}
        executionTimeRange={executionTimeRange}
        filterSeriesByGroupName={groups?.map((group) => group.value).concat(',')}
      />
    </EuiPanel>
  );
};
// eslint-disable-next-line import/no-default-export
export default LogsHistoryChart;
