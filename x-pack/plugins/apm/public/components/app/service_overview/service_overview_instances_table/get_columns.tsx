/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { isJavaAgentName } from '../../../../../common/agent_name';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../../common/i18n';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { MetricOverviewLink } from '../../../shared/Links/apm/MetricOverviewLink';
import { ServiceNodeMetricOverviewLink } from '../../../shared/Links/apm/ServiceNodeMetricOverviewLink';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { getLatencyColumnLabel } from '../get_latency_column_label';
import { PrimaryStatsServiceInstanceItem } from '../service_overview_instances_chart_and_table';

type ServiceInstanceComparisonStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/comparison_statistics'>;

export function getColumns({
  serviceName,
  agentName,
  latencyAggregationType,
  comparisonStatsData,
  comparisonEnabled,
}: {
  serviceName: string;
  agentName?: string;
  latencyAggregationType?: LatencyAggregationType;
  comparisonStatsData?: ServiceInstanceComparisonStatistics;
  comparisonEnabled?: boolean;
}): Array<EuiBasicTableColumn<PrimaryStatsServiceInstanceItem>> {
  return [
    {
      field: 'serviceNodeName',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnNodeName',
        { defaultMessage: 'Node name' }
      ),
      render: (_, item) => {
        const { serviceNodeName } = item;
        const isMissingServiceNodeName =
          serviceNodeName === SERVICE_NODE_NAME_MISSING;
        const text = isMissingServiceNodeName
          ? UNIDENTIFIED_SERVICE_NODES_LABEL
          : serviceNodeName;

        const link = isJavaAgentName(agentName) ? (
          <ServiceNodeMetricOverviewLink
            serviceName={serviceName}
            serviceNodeName={item.serviceNodeName}
          >
            {text}
          </ServiceNodeMetricOverviewLink>
        ) : (
          <MetricOverviewLink
            serviceName={serviceName}
            mergeQuery={(query) => ({
              ...query,
              kuery: isMissingServiceNodeName
                ? `NOT (service.node.name:*)`
                : `service.node.name:"${item.serviceNodeName}"`,
            })}
          >
            {text}
          </MetricOverviewLink>
        );

        return <TruncateWithTooltip text={text} content={link} />;
      },
      sortable: true,
    },
    {
      field: 'latencyValue',
      name: getLatencyColumnLabel(latencyAggregationType),
      width: px(unit * 10),
      render: (_, { serviceNodeName, latency }) => {
        const currentPeriodTimestamp =
          comparisonStatsData?.currentPeriod?.[serviceNodeName]?.latency;
        const previousPeriodTimestamp =
          comparisonStatsData?.previousPeriod?.[serviceNodeName]?.latency;
        return (
          <SparkPlot
            color="euiColorVis1"
            valueLabel={asMillisecondDuration(latency)}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimestamp : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'throughputValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnThroughput',
        { defaultMessage: 'Throughput' }
      ),
      width: px(unit * 10),
      render: (_, { serviceNodeName, throughput }) => {
        const currentPeriodTimestamp =
          comparisonStatsData?.currentPeriod?.[serviceNodeName]?.throughput;
        const previousPeriodTimestamp =
          comparisonStatsData?.previousPeriod?.[serviceNodeName]?.throughput;
        return (
          <SparkPlot
            compact
            color="euiColorVis0"
            valueLabel={asTransactionRate(throughput)}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimestamp : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'errorRateValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnErrorRate',
        { defaultMessage: 'Error rate' }
      ),
      width: px(unit * 8),
      render: (_, { serviceNodeName, errorRate }) => {
        const currentPeriodTimestamp =
          comparisonStatsData?.currentPeriod?.[serviceNodeName]?.errorRate;
        const previousPeriodTimestamp =
          comparisonStatsData?.previousPeriod?.[serviceNodeName]?.errorRate;
        return (
          <SparkPlot
            compact
            color="euiColorVis7"
            valueLabel={asPercent(errorRate, 1)}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimestamp : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'cpuUsageValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnCpuUsage',
        { defaultMessage: 'CPU usage (avg.)' }
      ),
      width: px(unit * 8),
      render: (_, { serviceNodeName, cpuUsage }) => {
        const currentPeriodTimestamp =
          comparisonStatsData?.currentPeriod?.[serviceNodeName]?.cpuUsage;
        const previousPeriodTimestamp =
          comparisonStatsData?.previousPeriod?.[serviceNodeName]?.cpuUsage;
        return (
          <SparkPlot
            compact
            color="euiColorVis2"
            valueLabel={asPercent(cpuUsage, 1)}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimestamp : undefined
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'memoryUsageValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnMemoryUsage',
        { defaultMessage: 'Memory usage (avg.)' }
      ),
      width: px(unit * 9),
      render: (_, { serviceNodeName, memoryUsage }) => {
        const currentPeriodTimestamp =
          comparisonStatsData?.currentPeriod?.[serviceNodeName]?.memoryUsage;
        const previousPeriodTimestamp =
          comparisonStatsData?.previousPeriod?.[serviceNodeName]?.memoryUsage;
        return (
          <SparkPlot
            compact
            color="euiColorVis3"
            valueLabel={asPercent(memoryUsage, 1)}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimestamp : undefined
            }
          />
        );
      },
      sortable: true,
    },
  ];
}
