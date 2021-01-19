/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { isJavaAgentName } from '../../../../../common/agent_name';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../../common/i18n';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import {
  APIReturnType,
  callApmApi,
} from '../../../../services/rest/createCallApmApi';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { px, unit } from '../../../../style/variables';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';
import { ServiceNodeMetricOverviewLink } from '../../../shared/Links/apm/ServiceNodeMetricOverviewLink';
import { MetricOverviewLink } from '../../../shared/Links/apm/MetricOverviewLink';

type ServiceInstanceItem = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances'>
>;

interface Props {
  serviceName: string;
}

export function ServiceOverviewInstancesTable({ serviceName }: Props) {
  const { agentName, transactionType } = useApmServiceContext();

  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();

  const columns: Array<EuiBasicTableColumn<ServiceInstanceItem>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnNodeName',
        {
          defaultMessage: 'Node name',
        }
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
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnLatency',
        {
          defaultMessage: 'Latency',
        }
      ),
      width: px(unit * 10),
      render: (_, { latency }) => {
        return (
          <SparkPlot
            color="euiColorVis1"
            series={latency?.timeseries}
            valueLabel={asMillisecondDuration(latency?.value)}
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
      render: (_, { throughput }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis0"
            series={throughput?.timeseries}
            valueLabel={asTransactionRate(throughput?.value)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'errorRateValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnErrorRate',
        {
          defaultMessage: 'Error rate',
        }
      ),
      width: px(unit * 8),
      render: (_, { errorRate }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis7"
            series={errorRate?.timeseries}
            valueLabel={asPercent(errorRate?.value, 1)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'cpuUsageValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnCpuUsage',
        {
          defaultMessage: 'CPU usage (avg.)',
        }
      ),
      width: px(unit * 8),
      render: (_, { cpuUsage }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis2"
            series={cpuUsage?.timeseries}
            valueLabel={asPercent(cpuUsage?.value, 1)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'memoryUsageValue',
      name: i18n.translate(
        'xpack.apm.serviceOverview.instancesTableColumnMemoryUsage',
        {
          defaultMessage: 'Memory usage (avg.)',
        }
      ),
      width: px(unit * 8),
      render: (_, { memoryUsage }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis3"
            series={memoryUsage?.timeseries}
            valueLabel={asPercent(memoryUsage?.value, 1)}
          />
        );
      },
      sortable: true,
    },
  ];

  const { data = [], status } = useFetcher(() => {
    if (!start || !end || !transactionType) {
      return;
    }

    return callApmApi({
      endpoint:
        'GET /api/apm/services/{serviceName}/service_overview_instances',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
          transactionType,
          uiFilters: JSON.stringify(uiFilters),
          numBuckets: 20,
        },
      },
    });
  }, [start, end, serviceName, transactionType, uiFilters]);

  // need top-level sortable fields for the managed table
  const items = data.map((item) => ({
    ...item,
    latencyValue: item.latency?.value ?? 0,
    throughputValue: item.throughput?.value ?? 0,
    errorRateValue: item.errorRate?.value ?? 0,
    cpuUsageValue: item.cpuUsage?.value ?? 0,
    memoryUsageValue: item.memoryUsage?.value ?? 0,
  }));

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.apm.serviceOverview.instancesTableTitle', {
              defaultMessage: 'All instances',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <ServiceOverviewTableContainer
            isEmptyAndLoading={items.length === 0 && isLoading}
          >
            <EuiInMemoryTable
              columns={columns}
              items={items}
              allowNeutralSort={false}
              loading={isLoading}
              pagination={{
                initialPageSize: 5,
                pageSizeOptions: [5],
                hidePerPageOptions: true,
              }}
              sorting={{
                sort: {
                  direction: 'desc',
                  field: 'throughputValue',
                },
              }}
            />
          </ServiceOverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
