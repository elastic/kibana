/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ENVIRONMENT_ALL,
  getNextEnvironmentUrlParam,
} from '../../../../../common/environment_filter_values';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceDependencyItem } from '../../../../../server/lib/services/get_service_dependencies';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { AgentIcon } from '../../../shared/AgentIcon';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceMapLink } from '../../../shared/Links/apm/ServiceMapLink';
import { ServiceOverviewLink } from '../../../shared/Links/apm/service_overview_link';
import { SpanIcon } from '../../../shared/span_icon';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';

interface Props {
  serviceName: string;
}

export function ServiceOverviewDependenciesTable({ serviceName }: Props) {
  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const columns: Array<EuiBasicTableColumn<ServiceDependencyItem>> = [
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
          defaultMessage: 'Latency',
        }
      ),
      width: px(unit * 10),
      render: (_, { latency }) => {
        return (
          <SparkPlot
            color="euiColorVis1"
            series={latency.timeseries}
            valueLabel={asMillisecondDuration(latency.value)}
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
      render: (_, { throughput }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis0"
            series={throughput.timeseries}
            valueLabel={asTransactionRate(throughput.value)}
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
      render: (_, { errorRate }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis7"
            series={errorRate.timeseries}
            valueLabel={asPercent(errorRate.value, 1)}
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
      render: (_, { impact }) => {
        return <ImpactBar size="m" value={impact} />;
      },
      sortable: true,
    },
  ];

  const { data = [], status } = useFetcher(() => {
    if (!start || !end) {
      return;
    }

    return callApmApi({
      endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
          environment: environment || ENVIRONMENT_ALL.value,
          numBuckets: 20,
        },
      },
    });
  }, [start, end, serviceName, environment]);

  // need top-level sortable fields for the managed table
  const items = data.map((item) => ({
    ...item,
    errorRateValue: item.errorRate.value,
    latencyValue: item.latency.value,
    throughputValue: item.throughput.value,
    impactValue: item.impact,
  }));

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate(
                  'xpack.apm.serviceOverview.dependenciesTableTitle',
                  {
                    defaultMessage: 'Dependencies',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceMapLink serviceName={serviceName}>
              {i18n.translate(
                'xpack.apm.serviceOverview.dependenciesTableLinkText',
                {
                  defaultMessage: 'View service map',
                }
              )}
            </ServiceMapLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <ServiceOverviewTableContainer
            isEmptyAndLoading={
              items.length === 0 && status === FETCH_STATUS.LOADING
            }
          >
            <EuiInMemoryTable
              columns={columns}
              items={items}
              allowNeutralSort={false}
              loading={status === FETCH_STATUS.LOADING}
              pagination={{
                initialPageSize: 5,
                pageSizeOptions: [5],
                hidePerPageOptions: true,
              }}
              sorting={{
                sort: {
                  direction: 'desc',
                  field: 'impactValue',
                },
              }}
            />
          </ServiceOverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
