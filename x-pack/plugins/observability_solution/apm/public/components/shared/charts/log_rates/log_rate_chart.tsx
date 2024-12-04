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
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { asDecimalOrInteger } from '../../../../../common/utils/formatters';
import { TooltipContent } from './tooltip_content';
import { Popover } from './popover';
import { ChartType, getTimeSeriesColor } from '../helper/get_timeseries_color';
import { ChartMetricType, getMetricsFormula } from '../helper/get_metrics_formulas';
import { ExploreLogsButton } from '../../explore_logs_button/explore_logs_button';
import { TimeseriesChartWithContext } from '../timeseries_chart_with_context';

type LogRateReturnType =
  APIReturnType<'GET /internal/apm/entities/services/{serviceName}/logs_rate_timeseries'>;

const INITIAL_STATE: LogRateReturnType = {
  currentPeriod: {},
};

export function LogRateChart({ height }: { height: number }) {
  const {
    query: { rangeFrom, rangeTo, environment, kuery },
    path: { serviceName },
  } = useApmParams('/services/{serviceName}');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi(
          'GET /internal/apm/entities/services/{serviceName}/logs_rate_timeseries',
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
  const { currentPeriodColor } = getTimeSeriesColor(ChartType.LOG_RATE);

  const timeseries = [
    {
      data: data?.currentPeriod?.[serviceName] ?? [],
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.logs.chart.logRate', {
        defaultMessage: 'Log Rate',
      }),
    },
  ];

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
                {i18n.translate('xpack.apm.logRate', {
                  defaultMessage: 'Log rate',
                })}{' '}
                <Popover>
                  <TooltipContent
                    formula={getMetricsFormula(ChartMetricType.LOG_RATE)}
                    description={
                      <FormattedMessage
                        defaultMessage="Rate of logs per minute observed for given {serviceName}."
                        id="xpack.apm.multiSignal.servicesTable.logRate.tooltip.description"
                        values={{
                          serviceName: (
                            <code
                              css={css`
                                word-break: break-word;
                              `}
                            >
                              {i18n.translate(
                                'xpack.apm.multiSignal.servicesTable.logRate.tooltip.serviceNameLabel',
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
            <ExploreLogsButton start={start} end={end} kuery={`service.name: "${serviceName}"`} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id="logRate"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={asDecimalOrInteger}
      />
    </EuiPanel>
  );
}
