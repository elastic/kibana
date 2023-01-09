/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import { getTransactionType } from '../../../../context/apm_service/apm_service_context';
import { useServiceAgentFetcher } from '../../../../context/apm_service/use_service_agent_fetcher';
import { useServiceTransactionTypesFetcher } from '../../../../context/apm_service/use_service_transaction_types_fetcher';
import { asPercent } from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getDurationFormatter } from '../../../../../common/utils/formatters/duration';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { getComparisonChartTheme } from '../../../shared/time_comparison/get_comparison_chart_theme';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
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
import { getAggsTypeFromRule, isLatencyThresholdRuleType } from './helpers';
import { filterNil } from '../../../shared/charts/latency_chart';
import { errorRateI18n } from '../../../shared/charts/failed_transaction_rate_chart';
import {
  AlertActiveRect,
  AlertAnnotation,
  AlertThresholdRect,
  AlertThresholdAnnotation,
} from './latency_chart_components';
import { SERVICE_ENVIRONMENT } from '../../../../../common/es_fields/apm';

export function AlertDetailsAppSection({
  rule,
  alert,
  timeZone,
}: AlertDetailsAppSectionProps) {
  const params = rule.params;
  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const latencyAggregationType = getAggsTypeFromRule(params.aggregationType);

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
  const { agentName } = useServiceAgentFetcher({
    serviceName,
    start,
    end,
  });
  const transactionTypes = useServiceTransactionTypesFetcher({
    serviceName,
    start,
    end,
  });

  const transactionType = getTransactionType({
    transactionType: alert.fields[TRANSACTION_TYPE],
    transactionTypes,
    agentName,
  });

  const comparisonChartTheme = getComparisonChartTheme();
  const INITIAL_STATE = {
    currentPeriod: [],
    previousPeriod: [],
  };

  /* Latency Chart */
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery: '',
                start,
                end,
                transactionType,
                transactionName: undefined,
                latencyAggregationType,
              },
            },
          }
        );
      }
    },
    [
      end,
      environment,
      latencyAggregationType,
      serviceName,
      start,
      transactionType,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        latencyAggregationType,
        previousPeriodLabel: '',
      }),
    // It should only update when the data has changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const { currentPeriod, previousPeriod } = memoizedData;

  const timeseriesLatency = [
    currentPeriod,
    comparisonEnabled && isTimeComparison(offset) ? previousPeriod : undefined,
  ].filter(filterNil);

  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  /* Latency Chart */

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

  /* Error Rate */
  type ErrorRate =
    APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>;

  const INITIAL_STATE_ERROR_RATE: ErrorRate = {
    currentPeriod: {
      timeseries: [],
      average: null,
    },
    previousPeriod: {
      timeseries: [],
      average: null,
    },
  };
  function yLabelFormat(y?: number | null) {
    return asPercent(y || 0, 1);
  }

  const {
    data: dataErrorRate = INITIAL_STATE_ERROR_RATE,
    status: statusErrorRate,
  } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
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

  const { currentPeriodColor: currentPeriodColorErrorRate } =
    getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

  const timeseriesErrorRate = [
    {
      data: dataErrorRate.currentPeriod.timeseries,
      type: 'linemark',
      color: currentPeriodColorErrorRate,
      title: i18n.translate('xpack.apm.errorRate.chart.errorRate', {
        defaultMessage: 'Failed transaction rate (avg.)',
      }),
    },
  ];
  /* Error Rate */

  const getLatencyChartAdditionalData = () => {
    if (isLatencyThresholdRuleType(alert.fields[ALERT_RULE_TYPE_ID])) {
      return [
        <AlertThresholdRect
          key={'alertThresholdRect'}
          threshold={alert.fields[ALERT_EVALUATION_THRESHOLD]}
          alertStarted={alert.start}
        />,
        <AlertAnnotation
          key={'alertAnnotationStart'}
          alertStarted={alert.start}
        />,
        <AlertActiveRect
          key={'alertAnnotationActiveRect'}
          alertStarted={alert.start}
        />,
        <AlertThresholdAnnotation
          key={'alertThresholdAnnotation'}
          threshold={alert.fields[ALERT_EVALUATION_THRESHOLD]}
        />,
      ];
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <ChartPointerEventContextProvider>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.dependencyLatencyChart.chartTitle',
                      {
                        defaultMessage: 'Latency',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <TimeseriesChart
              id="latencyChart"
              annotations={getLatencyChartAdditionalData()}
              height={200}
              comparisonEnabled={comparisonEnabled}
              offset={offset}
              fetchStatus={status}
              customTheme={comparisonChartTheme}
              timeseries={timeseriesLatency}
              yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
              timeZone={timeZone}
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
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
                        {i18n.translate('xpack.apm.errorRate', {
                          defaultMessage: 'Failed transaction rate',
                        })}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiIconTip content={errorRateI18n} position="right" />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <TimeseriesChart
                  id="errorRate"
                  height={200}
                  showAnnotations={false}
                  fetchStatus={statusErrorRate}
                  timeseries={timeseriesErrorRate}
                  yLabelFormat={yLabelFormat}
                  yDomain={{ min: 0, max: 1 }}
                  comparisonEnabled={false}
                  customTheme={comparisonChartTheme}
                  timeZone={timeZone}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </ChartPointerEventContextProvider>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
