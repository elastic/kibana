/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatAlertEvaluationValue } from '@kbn/observability-plugin/public';
import {
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { EuiCallOut } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { TimeRangeMetadataContextProvider } from '../../../../context/time_range_metadata/time_range_metadata_context';
import { getComparisonChartTheme } from '../../../shared/time_comparison/get_comparison_chart_theme';
import FailedTransactionChart from './failed_transaction_chart';
import { getAggsTypeFromRule } from './helpers';
import { LatencyAlertsHistoryChart } from './latency_alerts_history_chart';
import LatencyChart from './latency_chart';
import ThroughputChart from './throughput_chart';
import { AlertDetailsAppSectionProps } from './types';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';

export function AlertDetailsAppSection({
  rule,
  alert,
  timeZone,
  setAlertSummaryFields,
}: AlertDetailsAppSectionProps) {
  const { services } = useKibana();
  createCallApmApi(services as CoreStart);

  const alertRuleTypeId = alert.fields[ALERT_RULE_TYPE_ID];
  const alertEvaluationValue = alert.fields[ALERT_EVALUATION_VALUE];
  const alertEvaluationThreshold = alert.fields[ALERT_EVALUATION_THRESHOLD];

  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const serviceName = String(alert.fields[SERVICE_NAME]);
  const transactionName = alert.fields[TRANSACTION_NAME];
  const transactionType = alert.fields[TRANSACTION_TYPE];

  useEffect(() => {
    const alertSummaryFields = [
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.actualValue"
            defaultMessage="Actual value"
          />
        ),
        value: formatAlertEvaluationValue(
          alertRuleTypeId,
          alertEvaluationValue
        ),
      },
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.expectedValue"
            defaultMessage="Expected value"
          />
        ),
        value: formatAlertEvaluationValue(
          alertRuleTypeId,
          alertEvaluationThreshold
        ),
      },
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.serviceEnv"
            defaultMessage="Service environment"
          />
        ),
        value: environment,
      },
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.serviceName"
            defaultMessage="Service name"
          />
        ),
        value: serviceName,
      },
      ...(transactionName
        ? [
            {
              label: (
                <FormattedMessage
                  id="xpack.apm.pages.alertDetails.alertSummary.transactionName"
                  defaultMessage="Transaction name"
                />
              ),
              value: transactionName,
            },
          ]
        : []),
    ];
    setAlertSummaryFields(alertSummaryFields);
  }, [
    alertRuleTypeId,
    alertEvaluationValue,
    alertEvaluationThreshold,
    environment,
    serviceName,
    transactionName,
    setAlertSummaryFields,
  ]);

  const params = rule.params;
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);
  const timeRange = getPaddedAlertTimeRange(
    alert.fields[ALERT_START]!,
    alert.fields[ALERT_END]
  );
  const comparisonChartTheme = getComparisonChartTheme();
  const historicalRange = useMemo(() => {
    return {
      start: moment().subtract(30, 'days').toISOString(),
      end: moment().toISOString(),
    };
  }, []);

  const { from, to } = timeRange;
  if (!from || !to) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.apm.alertDetails.error.toastTitle"
            defaultMessage="An error occurred when identifying the alert time range."
          />
        }
        color="danger"
        iconType="error"
      >
        <p>
          <FormattedMessage
            id="xpack.apm.alertDetails.error.toastDescription"
            defaultMessage="Unable to load the alert details page's charts. Please try to refresh the page if the alert is newly created"
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <TimeRangeMetadataContextProvider
        start={from}
        end={to}
        kuery=""
        useSpanName={false}
        uiSettings={services.uiSettings!}
      >
        <ChartPointerEventContextProvider>
          <EuiFlexItem>
            <LatencyChart
              alert={alert}
              transactionType={transactionType}
              transactionName={transactionName}
              serviceName={serviceName}
              environment={environment}
              start={from}
              end={to}
              comparisonChartTheme={comparisonChartTheme}
              timeZone={timeZone}
              latencyAggregationType={latencyAggregationType}
              comparisonEnabled={false}
              offset={''}
            />
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="row" gutterSize="s">
              <ThroughputChart
                transactionType={transactionType}
                transactionName={transactionName}
                serviceName={serviceName}
                environment={environment}
                start={from}
                end={to}
                comparisonChartTheme={comparisonChartTheme}
                comparisonEnabled={false}
                offset={''}
                timeZone={timeZone}
              />
              <FailedTransactionChart
                transactionType={transactionType}
                transactionName={transactionName}
                serviceName={serviceName}
                environment={environment}
                start={from}
                end={to}
                comparisonChartTheme={comparisonChartTheme}
                timeZone={timeZone}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LatencyAlertsHistoryChart
              ruleId={alert.fields[ALERT_RULE_UUID]}
              serviceName={serviceName}
              start={historicalRange.start}
              end={historicalRange.end}
              transactionType={transactionType}
              latencyAggregationType={latencyAggregationType}
              environment={environment}
              timeZone={timeZone}
            />
          </EuiFlexItem>
        </ChartPointerEventContextProvider>
      </TimeRangeMetadataContextProvider>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
