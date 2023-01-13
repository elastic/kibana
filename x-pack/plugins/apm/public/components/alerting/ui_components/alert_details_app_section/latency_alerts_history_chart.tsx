/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { useFetchTriggeredAlertsHistory } from '@kbn/observability-plugin/public';
import {
  AnnotationDomainType,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { filterNil } from '../../../shared/charts/latency_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';

interface LatencyAlertsHistoryChartProps {
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType: LatencyAggregationType;
  environment: string;
  timeZone: string;
  ruleId: string;
}
export function LatencyAlertsHistoryChart({
  serviceName,
  start,
  end,
  transactionType,
  latencyAggregationType,
  environment,
  timeZone,
  ruleId,
}: LatencyAlertsHistoryChartProps) {
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
                start: moment().subtract(30, 'days').toISOString(),
                end: moment().toISOString(),
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
  const timeseriesLatency = [currentPeriod, previousPeriod].filter(filterNil);
  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);
  const { triggeredAlertsData } = useFetchTriggeredAlertsHistory({
    features: 'apm',
    ruleId,
  });
  const getFormattedDuration = (avgTimeToRecover: number) => {
    if (!avgTimeToRecover) return;
    const time = moment.duration(avgTimeToRecover);
    if (time.hours() > 0) {
      return `${time.hours()}h ${time.minutes()}m`;
    } else {
      return `${time.minutes()}m ${time.seconds()}s`;
    }
  };
  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.latencyChartHistory.chartTitle', {
                defaultMessage: 'Kibana latency alerts history',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.latencyChartHistory.last30days', {
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
                  <h3>{triggeredAlertsData?.totalTriggeredAlerts}</h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.apm.latencyChartHistory.alertsTriggered',
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
                  {getFormattedDuration(
                    triggeredAlertsData?.avgTimeToRecoverMS || 0
                  )}
                </h3>
              </EuiTitle>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.apm.latencyChartHistory.avgTimeToRecover',
                {
                  defaultMessage: 'Avg time to recover',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <TimeseriesChart
        id="latencyChart"
        annotations={[
          <LineAnnotation
            id="annotations"
            domainType={AnnotationDomainType.XDomain}
            dataValues={
              triggeredAlertsData?.histogramTriggeredAlerts
                .filter((annotation) => annotation.doc_count > 0)
                .map((annotation) => {
                  return {
                    dataValue: annotation.key,
                    header: String(annotation.doc_count),
                    details: moment(annotation.key_as_string).format(
                      'yyyy-MM-DD'
                    ),
                  };
                }) || []
            }
            style={{
              line: { strokeWidth: 3, stroke: 'red', opacity: 1 },
            }}
            marker={<EuiIcon type="alert" color={'red'} />}
            markerBody={(data) => (
              <>
                <EuiBadge color="#BD271E">
                  <EuiText size="xs" color="white">
                    {data.header}
                  </EuiText>
                </EuiBadge>
                <EuiSpacer size="xs" />
              </>
            )}
            markerPosition={Position.Top}
          />,
        ]}
        height={200}
        comparisonEnabled={false}
        offset={''}
        fetchStatus={status}
        timeseries={timeseriesLatency}
        yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
        timeZone={timeZone}
      />
    </EuiPanel>
  );
}
