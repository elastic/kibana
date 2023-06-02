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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getPaddedAlertTimeRange } from '@kbn/observability-alert-details';
import { EuiCallOut } from '@elastic/eui';
import { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { TimeRangeMetadataContextProvider } from '../../../../context/time_range_metadata/time_range_metadata_context';
import { getComparisonChartTheme } from '../../../shared/time_comparison/get_comparison_chart_theme';
import FailedTransactionChart from './failed_transaction_chart';
import { getAggsTypeFromRule } from './helpers';
import { LatencyAlertsHistoryChart } from './latency_alerts_history_chart';
import LatencyChart from './latency_chart';
import ThroughputChart from './throughput_chart';
import {
  AlertDetailsAppSectionProps,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from './types';

export function AlertDetailsAppSection({
  rule,
  alert,
  timeZone,
  setAlertSummaryFields,
}: AlertDetailsAppSectionProps) {
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
          alert?.fields[ALERT_RULE_TYPE_ID],
          alert?.fields[ALERT_EVALUATION_VALUE]
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
          alert?.fields[ALERT_RULE_TYPE_ID],
          alert?.fields[ALERT_EVALUATION_THRESHOLD]
        ),
      },
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.serviceEnv"
            defaultMessage="Service environment"
          />
        ),
        value: alert?.fields[SERVICE_ENVIRONMENT],
      },
      {
        label: (
          <FormattedMessage
            id="xpack.apm.pages.alertDetails.alertSummary.serviceName"
            defaultMessage="Service name"
          />
        ),
        value: alert?.fields[SERVICE_NAME],
      },
    ];
    setAlertSummaryFields(alertSummaryFields);
  }, [alert?.fields, setAlertSummaryFields]);

  const {
    services: { uiSettings },
  } = useKibana();

  const params = rule.params;
  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);
  const serviceName = String(alert.fields[SERVICE_NAME]);
  const timeRange = getPaddedAlertTimeRange(
    alert.fields[ALERT_START]!,
    alert.fields[ALERT_END]
  );
  const transactionType = alert.fields[TRANSACTION_TYPE];
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
        uiSettings={uiSettings!}
      >
        <ChartPointerEventContextProvider>
          <EuiFlexItem>
            <LatencyChart
              alert={alert}
              transactionType={transactionType}
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
