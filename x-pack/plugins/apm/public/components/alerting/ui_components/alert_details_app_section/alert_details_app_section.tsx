/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiTitle, EuiIconTip } from '@elastic/eui';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_UUID,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_RULE_TYPE_ID,
  ALERT_EVALUATION_VALUE,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import { formatAlertEvaluationValue } from '@kbn/observability-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDurationFormatter } from '@kbn/observability-plugin/common';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { getComparisonChartTheme } from '../../../shared/time_comparison/get_comparison_chart_theme';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { getResponseTimeTickFormatter } from '../../../shared/charts/transaction_charts/helper';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';
import {
  AlertDetailsAppSectionProps,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from './types';
import { getAggsTypeFromRule } from './helpers';
import { LatencyAlertsHistoryChart } from './latency_alerts_history_chart';

import { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';
import FailedTransactionChart from './failed_transaction_chart';
import LatencyChart from './latency_chart/latency_chart';

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
            defaultMessage="Service Environment"
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

  const params = rule.params;
  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);
  const [latencyMaxY, setLatencyMaxY] = useState(0);

  // duration is us, convert it to MS
  const alertDurationMS = alert.fields[ALERT_DURATION]! / 1000;

  const serviceName = String(alert.fields[SERVICE_NAME]);

  // Currently, we don't use comparisonEnabled nor offset.
  // But providing them as they are required for the chart.
  const comparisonEnabled = false;
  const offset = '1d';
  const ruleWindowSizeMS = moment
    .duration(rule.params.windowSize, rule.params.windowUnit)
    .asMilliseconds();

  const TWENTY_TIMES_RULE_WINDOW_MS = 20 * ruleWindowSizeMS;
  /**
   * This is part or the requirements (RFC).
   * If the alert is less than 20 units of `FOR THE LAST <x> <units>` then we should draw a time range of 20 units.
   * IE. The user set "FOR THE LAST 5 minutes" at a minimum we should show 100 minutes.
   */
  const rangeFrom =
    alertDurationMS < TWENTY_TIMES_RULE_WINDOW_MS
      ? moment(alert.start)
          .subtract(TWENTY_TIMES_RULE_WINDOW_MS, 'millisecond')
          .toISOString()
      : moment(alert.start)
          .subtract(ruleWindowSizeMS, 'millisecond')
          .toISOString();

  const rangeTo = alert.active
    ? 'now'
    : moment(alert.fields[ALERT_END])
        .add(ruleWindowSizeMS, 'millisecond')
        .toISOString();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const transactionType = alert.fields[TRANSACTION_TYPE];
  const comparisonChartTheme = getComparisonChartTheme();
  const INITIAL_STATE = {
    currentPeriod: [],
    previousPeriod: [],
  };

  const latencyFormatter = getDurationFormatter(latencyMaxY);

  /* Throughput Chart */
  const { data: dataThroughput = INITIAL_STATE, status: statusThroughput } =
    useFetcher(
      (callApmApi) => {
        if (serviceName && transactionType && start && end) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/throughput',
            {
              params: {
                path: {
                  serviceName,
                },
                query: {
                  environment,
                  kuery: '',
                  start,
                  end,
                  transactionType,
                  transactionName: undefined,
                },
              },
            }
          );
        }
      },
      [environment, serviceName, start, end, transactionType]
    );
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.THROUGHPUT
  );
  const timeseriesThroughput = [
    {
      data: dataThroughput.currentPeriod,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: dataThroughput.previousPeriod,
            type: 'area',
            color: previousPeriodColor,
            title: '',
          },
        ]
      : []),
  ];

  /* Throughput Chart */

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <ChartPointerEventContextProvider>
        <EuiFlexItem>
          <LatencyChart
            alert={alert}
            transactionType={transactionType}
            serviceName={serviceName}
            environment={environment}
            start={start}
            end={end}
            comparisonChartTheme={comparisonChartTheme}
            timeZone={timeZone}
            latencyAggregationType={latencyAggregationType}
            comparisonEnabled={comparisonEnabled}
            offset={offset}
            setLatencyMaxY={setLatencyMaxY}
          />
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceOverview.throughtputChartTitle',
                          { defaultMessage: 'Throughput' }
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      content={i18n.translate(
                        'xpack.apm.serviceOverview.tpmHelp',
                        {
                          defaultMessage:
                            'Throughput is measured in transactions per minute (tpm).',
                        }
                      )}
                      position="right"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <TimeseriesChart
                  id="throughput"
                  height={200}
                  comparisonEnabled={comparisonEnabled}
                  offset={offset}
                  fetchStatus={statusThroughput}
                  customTheme={comparisonChartTheme}
                  timeseries={timeseriesThroughput}
                  yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
                  timeZone={timeZone}
                />
              </EuiPanel>
            </EuiFlexItem>
            <FailedTransactionChart
              transactionType={transactionType}
              serviceName={serviceName}
              environment={environment}
              start={start}
              end={end}
              comparisonChartTheme={comparisonChartTheme}
              timeZone={timeZone}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LatencyAlertsHistoryChart
            ruleId={alert.fields[ALERT_RULE_UUID]}
            serviceName={serviceName}
            start={start}
            end={end}
            transactionType={transactionType}
            latencyAggregationType={latencyAggregationType}
            environment={environment}
            timeZone={timeZone}
          />
        </EuiFlexItem>
      </ChartPointerEventContextProvider>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
