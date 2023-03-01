/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  groupBy,
  keyBy,
  mapValues,
  merge,
  orderBy,
  type Dictionary,
} from 'lodash';
import React from 'react';
import { ApmMlDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { ApmMlJobResultWithTimeseries } from '../../../../common/anomaly_detection/apm_ml_job_result';
import { ApmMlModule } from '../../../../common/anomaly_detection/apm_ml_module';
import { NodeType } from '../../../../common/connections';
import {
  asDuration,
  asExactTransactionRate,
  asPercent,
} from '../../../../common/utils/formatters';
import { AgentIcon } from '../agent_icon';
import { ChartType } from '../charts/helper/get_timeseries_color';
import { SpanIcon } from '../span_icon';
import { ServiceSummaryDestinationContextMenu } from './service_summary_destination_context_menu';
import { ServiceSummaryTimeseriesChart } from './service_summary_timeseries_chart';
import { useServiceSummaryAnomalyFetcher } from './use_service_summary_anomaly_fetcher';
import { useServiceSummaryServiceDestinationFetcher } from './use_service_summary_service_destination_fetcher';
import { ServiceSummaryFlyoutParams, ServiceSummaryFlyoutRoutePath } from '.';
import { useApmRouter } from '../../../hooks/use_apm_router';

interface Props {
  serviceDestinationSummaryFetch: ReturnType<
    typeof useServiceSummaryServiceDestinationFetcher
  >;
  anomalySummaryFetch: ReturnType<typeof useServiceSummaryAnomalyFetcher>;
  params: ServiceSummaryFlyoutParams;
  serviceName: string;
  routePath: ServiceSummaryFlyoutRoutePath;
}

export function ServiceSummaryServiceDestinationCharts({
  serviceDestinationSummaryFetch,
  anomalySummaryFetch,
  params,
  routePath,
  serviceName,
}: Props) {
  // const theme = useTheme();

  const router = useApmRouter();

  const anomaliesByDestination = mapValues(
    groupBy(
      anomalySummaryFetch.data?.anomalies.filter(
        (stat) => stat.job.module === ApmMlModule.ServiceDestination
      ),
      (value) => value.by
    ),
    (stats) => keyBy(stats, 'type')
  );

  const mappedDestinations = (
    serviceDestinationSummaryFetch.data?.stats ?? []
  ).map((stats) => {
    const anomalyStats: Dictionary<ApmMlJobResultWithTimeseries> =
      anomaliesByDestination[stats.destination.address];

    return merge({}, stats, {
      latency: {
        severity:
          anomalyStats?.[ApmMlDetectorType.serviceDestinationLatency].anomalies
            .max,
      },
      throughput: {
        severity:
          anomalyStats?.[ApmMlDetectorType.serviceDestinationThroughput]
            .anomalies.max,
      },
      failureRate: {
        severity:
          anomalyStats?.[ApmMlDetectorType.serviceDestinationFailureRate]
            .anomalies.max,
      },
    });
  });

  const sortedDestinations = orderBy(
    mappedDestinations,
    ['latency.severity', 'throughput.severity', 'failureRate.severity'],
    ['desc', 'desc', 'desc']
  );

  return (
    <>
      {sortedDestinations.map((stats) => {
        const destination = stats.destination;

        const anomalyTimeseriesByDetector =
          anomaliesByDestination[destination.address];

        let title: React.ReactNode;
        let icon: React.ReactNode | undefined;

        if ('type' in stats.destination) {
          [icon, title] =
            stats.destination.type === NodeType.service
              ? [
                  <AgentIcon agentName={stats.destination.agentName} />,
                  <EuiLink
                    href={router.link(routePath, {
                      ...params,
                      query: {
                        ...params.query,
                        highlighted: stats.destination.serviceName,
                      },
                    })}
                  >
                    {stats.destination.serviceName}
                  </EuiLink>,
                ]
              : [
                  <SpanIcon
                    type={stats.destination.spanType}
                    subtype={stats.destination.spanSubtype}
                  />,
                  stats.destination.dependencyName,
                ];
        } else {
          title = stats.destination.address;
          icon = undefined;
        }

        return (
          <>
            <EuiFlexGroup
              direction="row"
              alignItems="center"
              gutterSize="s"
              style={
                {
                  // marginLeft: -24,
                  // marginRight: -24,
                  // background: theme.eui.euiColorLightestShade,
                  // paddingLeft: 24,
                  // paddingRight: 24,
                  // paddingTop: 8,
                  // paddingBottom: 8,
                }
              }
            >
              {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
              <EuiFlexItem grow>
                <EuiTitle size="xxxs">
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ alignContent: 'flex-end' }}>
                <ServiceSummaryDestinationContextMenu
                  destination={stats.destination}
                  jobId={
                    anomalyTimeseriesByDetector?.[
                      ApmMlDetectorType.serviceDestinationLatency
                    ].job.jobId
                  }
                  params={params}
                  serviceName={serviceName}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="row">
              <EuiFlexItem>
                <ServiceSummaryTimeseriesChart
                  chartType={ChartType.LATENCY_AVG}
                  data={stats?.latency.timeseries}
                  dataFetchStatus={serviceDestinationSummaryFetch.status}
                  id={`service_summary_service_destination_latency_${destination}`}
                  title={i18n.translate(
                    'xpack.serviceSummaryServiceDestinationCharts.latency',
                    { defaultMessage: 'Latency' }
                  )}
                  yLabelFormat={asDuration}
                  anomalyTimeseries={
                    anomalyTimeseriesByDetector?.[
                      ApmMlDetectorType.serviceDestinationLatency
                    ]
                  }
                  compact
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ServiceSummaryTimeseriesChart
                  chartType={ChartType.THROUGHPUT}
                  data={stats?.throughput.timeseries}
                  dataFetchStatus={serviceDestinationSummaryFetch.status}
                  id={`service_summary_service_destination_throughput_${destination}`}
                  title={i18n.translate(
                    'xpack.serviceSummaryServiceDestinationCharts.throughput',
                    { defaultMessage: 'Throughput' }
                  )}
                  yLabelFormat={asExactTransactionRate}
                  anomalyTimeseries={
                    anomalyTimeseriesByDetector?.[
                      ApmMlDetectorType.serviceDestinationThroughput
                    ]
                  }
                  compact
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ServiceSummaryTimeseriesChart
                  chartType={ChartType.FAILED_TRANSACTION_RATE}
                  data={stats?.failureRate.timeseries}
                  dataFetchStatus={serviceDestinationSummaryFetch.status}
                  id={`service_summary_service_destination_failure_rate_${destination}`}
                  title={i18n.translate(
                    'xpack.serviceSummaryServiceDestinationCharts.failureRate',
                    { defaultMessage: 'Failure rate' }
                  )}
                  yLabelFormat={(y) => asPercent(y, 1)}
                  anomalyTimeseries={
                    anomalyTimeseriesByDetector?.[
                      ApmMlDetectorType.serviceDestinationFailureRate
                    ]
                  }
                  compact
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        );
      })}
    </>
  );
}
