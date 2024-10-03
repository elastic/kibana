/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { formatAlertEvaluationValue, Threshold } from '@kbn/observability-plugin/public';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import {
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
} from '@kbn/rule-data-utils';
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
import LatencyChart from './latency_chart';
import ThroughputChart from './throughput_chart';
import { AlertDetailsAppSectionProps } from './types';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';

export function AlertDetailsAppSection({ rule, alert, timeZone }: AlertDetailsAppSectionProps) {
  const { services } = useKibana();
  createCallApmApi(services as CoreStart);

  const alertRuleTypeId = alert.fields[ALERT_RULE_TYPE_ID];
  const alertEvaluationValue = alert.fields[ALERT_EVALUATION_VALUE];
  const alertEvaluationThreshold = alert.fields[ALERT_EVALUATION_THRESHOLD];

  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const serviceName = String(alert.fields[SERVICE_NAME]);
  const transactionName = alert.fields[TRANSACTION_NAME];
  const transactionType = alert.fields[TRANSACTION_TYPE];

  const params = rule.params;
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const comparisonChartTheme = getComparisonChartTheme();
  const chartThemes = useChartThemes();
  const thresholdComponent =
    alertEvaluationValue && alertEvaluationThreshold ? (
      <Threshold
        chartProps={chartThemes}
        id="latency-threshold"
        threshold={[alertEvaluationThreshold]}
        value={alertEvaluationValue}
        valueFormatter={(d: number) => String(formatAlertEvaluationValue(alertRuleTypeId, d))}
        title={i18n.translate('xpack.apm.alertDetails.thresholdTitle', {
          defaultMessage: 'Threshold breached',
        })}
        comparator={COMPARATORS.GREATER_THAN}
      />
    ) : undefined;

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
              threshold={thresholdComponent}
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
        </ChartPointerEventContextProvider>
      </TimeRangeMetadataContextProvider>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
