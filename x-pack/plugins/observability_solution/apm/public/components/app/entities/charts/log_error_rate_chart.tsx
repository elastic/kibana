/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiTitle, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { SERVICE_NAME } from '@kbn/observability-shared-plugin/common';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getTimeSeriesColor, ChartType } from '../../../shared/charts/helper/get_timeseries_color';
import { TimeseriesChartWithContext } from '../../../shared/charts/timeseries_chart_with_context';
import { asInteger } from '../../../../../common/utils/formatters';
import { TooltipContent } from '../../service_inventory/multi_signal_inventory/table/tooltip_content';
import { Popover } from '../../service_inventory/multi_signal_inventory/table/popover';
import {
  ChartMetricType,
  getMetricsFormula,
} from '../../../shared/charts/helper/get_metrics_formulas';
import { ExploreLogsButton } from '../../../shared/explore_logs_button/explore_logs_button';
import { mergeKueries, toKueryFilterFormat } from '../../../../../common/utils/kuery_utils';
import { ERROR_LOG_LEVEL, LOG_LEVEL } from '../../../../../common/es_fields/apm';

type LogErrorRateReturnType =
  APIReturnType<'GET /internal/apm/entities/services/{serviceName}/logs_error_rate_timeseries'>;

const INITIAL_STATE: LogErrorRateReturnType = {
  currentPeriod: {},
};

export function LogErrorRateChart({ height }: { height: number }) {
  const {
    query: { rangeFrom, rangeTo, environment, kuery },
    path: { serviceName },
  } = useApmParams('/services/{serviceName}');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi(
          'GET /internal/apm/entities/services/{serviceName}/logs_error_rate_timeseries',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                environment,
                kuery,
                start,
                end,
              },
            },
          }
        );
      }
    },
    [environment, kuery, serviceName, start, end]
  );
  const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_ERROR_RATE);

  const timeseries = [
    {
      data: data?.currentPeriod?.[serviceName] ?? [],
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.logs.chart.logsErrorRate', {
        defaultMessage: 'Log Error Rate',
      }),
    },
  ];

  const errorLogKueryFormat = mergeKueries(
    [
      toKueryFilterFormat(LOG_LEVEL, ['error', 'ERROR']),
      toKueryFilterFormat(ERROR_LOG_LEVEL, ['error', 'ERROR']),
    ],
    'OR'
  );

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.logErrorRate', {
                  defaultMessage: 'Log error rate',
                })}{' '}
                <Popover>
                  <TooltipContent
                    formula={getMetricsFormula(ChartMetricType.LOG_ERROR_RATE)}
                    description={
                      <FormattedMessage
                        defaultMessage="Rate of error logs per minute observed for given {serviceName}."
                        id="xpack.apm.logErrorRate.tooltip.description"
                        values={{
                          serviceName: (
                            <code
                              css={css`
                                word-break: break-word;
                              `}
                            >
                              {i18n.translate(
                                'xpack.apm.multiSignal.servicesTable.logErrorRate.tooltip.serviceNameLabel',
                                {
                                  defaultMessage: 'service.name',
                                }
                              )}
                            </code>
                          ),
                        }}
                      />
                    }
                  />
                </Popover>
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExploreLogsButton
              start={start}
              end={end}
              kuery={mergeKueries([
                `(${errorLogKueryFormat})`,
                toKueryFilterFormat(SERVICE_NAME, [serviceName]),
              ])}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id="logErrorRate"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={asInteger}
      />
    </EuiPanel>
  );
}
