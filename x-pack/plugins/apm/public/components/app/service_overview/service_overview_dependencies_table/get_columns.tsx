/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getNextEnvironmentUrlParam } from '../../../../../common/environment_filter_values';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { AgentIcon } from '../../../shared/AgentIcon';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceOverviewLink } from '../../../shared/Links/apm/service_overview_link';
import { SpanIcon } from '../../../shared/span_icon';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';

type ServiceDependencies = APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;

export function getColumns({
  environment,
  previousPeriod,
  comparisonEnabled,
}: {
  environment?: string;
  previousPeriod: ServiceDependencies['previousPeriod'];
  comparisonEnabled?: boolean;
}): Array<EuiBasicTableColumn<ServiceDependencies['currentPeriod'][0]>> {
  return [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnBackend',
        {
          defaultMessage: 'Backend',
        }
      ),
      render: (_, item) => {
        return (
          <TruncateWithTooltip
            text={item.name}
            content={
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  {item.type === 'service' ? (
                    <AgentIcon agentName={item.agentName} />
                  ) : (
                    <SpanIcon type={item.spanType} subType={item.spanSubtype} />
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  {item.type === 'service' ? (
                    <ServiceOverviewLink
                      serviceName={item.serviceName}
                      environment={getNextEnvironmentUrlParam({
                        requestedEnvironment: item.environment,
                        currentEnvironmentUrlParam: environment,
                      })}
                    >
                      {item.name}
                    </ServiceOverviewLink>
                  ) : (
                    item.name
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'latencyValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnLatency',
        {
          defaultMessage: 'Latency (avg.)',
        }
      ),
      width: px(unit * 10),
      render: (_, item) => {
        const previousPeriodLatencyTimeseries =
          previousPeriod?.[item.name]?.latency.timeseries;
        return (
          <SparkPlot
            color="euiColorVis1"
            series={item.latency.timeseries}
            valueLabel={asMillisecondDuration(item.latency.value)}
            comparisonSeries={
              comparisonEnabled ? previousPeriodLatencyTimeseries : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'throughputValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnThroughput',
        { defaultMessage: 'Throughput' }
      ),
      width: px(unit * 10),
      render: (_, item) => {
        const previousPeriodThroughputTimeseries =
          previousPeriod?.[item.name]?.throughput.timeseries;
        return (
          <SparkPlot
            compact
            color="euiColorVis0"
            series={item.throughput.timeseries}
            valueLabel={asTransactionRate(item.throughput.value)}
            comparisonSeries={
              comparisonEnabled ? previousPeriodThroughputTimeseries : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'errorRateValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnErrorRate',
        {
          defaultMessage: 'Error rate',
        }
      ),
      width: px(unit * 10),
      render: (_, item) => {
        const previousPeriodErrorRateTimeseries =
          previousPeriod?.[item.name]?.errorRate.timeseries;
        return (
          <SparkPlot
            compact
            color="euiColorVis7"
            series={item.errorRate.timeseries}
            valueLabel={asPercent(item.errorRate.value, 1)}
            comparisonSeries={
              comparisonEnabled ? previousPeriodErrorRateTimeseries : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'impactValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnImpact',
        {
          defaultMessage: 'Impact',
        }
      ),
      width: px(unit * 5),
      render: (_, item) => {
        const previousPeriodImpact = previousPeriod?.[item.name]?.impact || 0;
        return (
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={item.impact} size="m" />
            </EuiFlexItem>
            {comparisonEnabled && (
              <EuiFlexItem>
                <ImpactBar
                  value={previousPeriodImpact}
                  size="s"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
      sortable: true,
    },
  ];
}
