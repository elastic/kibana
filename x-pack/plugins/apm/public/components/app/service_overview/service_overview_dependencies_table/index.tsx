/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { EuiLink } from '@elastic/eui';
import { ValuesType } from 'utility-types';
import { NodeType } from '../../../../../common/connections';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { unit } from '../../../../utils/style';
import { AgentIcon } from '../../../shared/agent_icon';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceMapLink } from '../../../shared/Links/apm/ServiceMapLink';
import { SpanIcon } from '../../../shared/span_icon';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';

interface Props {
  serviceName: string;
}

type ServiceDependencyItem = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>['serviceItems']
>;

export function ServiceOverviewDependenciesTable({ serviceName }: Props) {
  const {
    urlParams: { start, end, environment, comparisonEnabled, comparisonType },
  } = useUrlParams();

  const {
    query: { rangeFrom, rangeTo, kuery, latencyAggregationType },
  } = useApmParams('/services/:serviceName/overview');

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const apmRouter = useApmRouter();

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
        const { to } = item;
        const name =
          to.type === NodeType.backend ? to.backendName : to.serviceName;

        const href =
          to.type === NodeType.backend
            ? apmRouter.link('/backends/:backendName/overview', {
                path: { backendName: to.backendName },
                query: { environment, kuery, rangeFrom, rangeTo },
              })
            : apmRouter.link('/services/:serviceName/overview', {
                path: { serviceName: to.serviceName },
                query: {
                  comparisonEnabled: comparisonEnabled ? 'true' : 'false',
                  comparisonType,
                  environment,
                  kuery,
                  latencyAggregationType,
                  rangeFrom,
                  rangeTo,
                  transactionType: undefined,
                },
              });

        return (
          <TruncateWithTooltip
            text={name}
            content={
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  {item.to.type === NodeType.service ? (
                    <AgentIcon agentName={item.to.agentName} />
                  ) : (
                    <SpanIcon
                      type={item.to.spanType}
                      subType={item.to.spanSubtype}
                    />
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLink href={href}>{name}</EuiLink>
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
      width: `${unit * 10}px`,
      render: (_, { currentMetrics, previousMetrics }) => {
        return (
          <SparkPlot
            color="euiColorVis1"
            series={currentMetrics.latency.timeseries}
            comparisonSeries={
              comparisonEnabled
                ? previousMetrics?.latency.timeseries
                : undefined
            }
            valueLabel={asMillisecondDuration(currentMetrics.latency.value)}
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
      width: `${unit * 10}px`,
      render: (_, { currentMetrics, previousMetrics }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis0"
            series={currentMetrics.throughput.timeseries}
            comparisonSeries={
              comparisonEnabled
                ? previousMetrics?.throughput.timeseries
                : undefined
            }
            valueLabel={asTransactionRate(currentMetrics.throughput.value)}
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
      width: `${unit * 10}px`,
      render: (_, { currentMetrics, previousMetrics }) => {
        return (
          <SparkPlot
            compact
            color="euiColorVis7"
            series={currentMetrics.errorRate.timeseries}
            comparisonSeries={
              comparisonEnabled
                ? previousMetrics?.errorRate.timeseries
                : undefined
            }
            valueLabel={asPercent(currentMetrics.errorRate.value, 1)}
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
      width: `${unit * 5}px`,
      render: (_, { currentMetrics, previousMetrics }) => {
        return (
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={currentMetrics.impact} size="m" />
            </EuiFlexItem>
            {comparisonEnabled && previousMetrics?.impact !== undefined && (
              <EuiFlexItem>
                <ImpactBar
                  value={previousMetrics?.impact}
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
  // Fetches current period dependencies
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
        params: {
          path: { serviceName },
          query: { start, end, environment, numBuckets: 20, offset },
        },
      });
    },
    [start, end, serviceName, environment, offset]
  );

  // need top-level sortable fields for the managed table
  const items =
    data?.serviceItems.map((item) => ({
      ...item,
      errorRateValue: item.currentMetrics.errorRate.value,
      latencyValue: item.currentMetrics.latency.value,
      throughputValue: item.currentMetrics.throughput.value,
      impactValue: item.currentMetrics.impact,
    })) ?? [];

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
