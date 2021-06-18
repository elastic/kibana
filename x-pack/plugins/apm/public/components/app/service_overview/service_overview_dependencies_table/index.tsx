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
import { keyBy } from 'lodash';
import React from 'react';
import { offsetPreviousPeriodCoordinates } from '../../../../../common/utils/offset_previous_period_coordinate';
import { Coordinate } from '../../../../../typings/timeseries';
import { getNextEnvironmentUrlParam } from '../../../../../common/environment_filter_values';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceDependencyItem } from '../../../../../server/lib/services/get_service_dependencies';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { px, unit } from '../../../../style/variables';
import { AgentIcon } from '../../../shared/agent_icon';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceMapLink } from '../../../shared/Links/apm/ServiceMapLink';
import { ServiceOverviewLink } from '../../../shared/Links/apm/service_overview_link';
import { SpanIcon } from '../../../shared/span_icon';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';

interface Props {
  serviceName: string;
}

type ServiceDependencyPeriods = ServiceDependencyItem & {
  latency: { previousPeriodTimeseries?: Coordinate[] };
  throughput: { previousPeriodTimeseries?: Coordinate[] };
  errorRate: { previousPeriodTimeseries?: Coordinate[] };
  previousPeriodImpact?: number;
};

function mergeCurrentAndPreviousPeriods({
  currentPeriod = [],
  previousPeriod = [],
}: {
  currentPeriod?: ServiceDependencyItem[];
  previousPeriod?: ServiceDependencyItem[];
}): ServiceDependencyPeriods[] {
  const previousPeriodMap = keyBy(previousPeriod, 'name');

  return currentPeriod.map((currentDependency) => {
    const previousDependency = previousPeriodMap[currentDependency.name];
    if (!previousDependency) {
      return currentDependency;
    }
    return {
      ...currentDependency,
      latency: {
        ...currentDependency.latency,
        previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries: currentDependency.latency.timeseries,
          previousPeriodTimeseries: previousDependency.latency?.timeseries,
        }),
      },
      throughput: {
        ...currentDependency.throughput,
        previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries: currentDependency.throughput.timeseries,
          previousPeriodTimeseries: previousDependency.throughput?.timeseries,
        }),
      },
      errorRate: {
        ...currentDependency.errorRate,
        previousPeriodTimeseries: offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries: currentDependency.errorRate.timeseries,
          previousPeriodTimeseries: previousDependency.errorRate?.timeseries,
        }),
      },
      previousPeriodImpact: previousDependency.impact,
    };
  });
}

export function ServiceOverviewDependenciesTable({ serviceName }: Props) {
  const {
    urlParams: { start, end, environment, comparisonEnabled, comparisonType },
  } = useUrlParams();

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const columns: Array<EuiBasicTableColumn<ServiceDependencyPeriods>> = [
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
      render: (_, { latency }) => {
        return (
          <SparkPlot
            color="euiColorVis1"
            series={latency.timeseries}
            comparisonSeries={
              comparisonEnabled ? latency.previousPeriodTimeseries : undefined
            }
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
            comparisonSeries={
              comparisonEnabled
                ? throughput.previousPeriodTimeseries
                : undefined
            }
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
            comparisonSeries={
              comparisonEnabled ? errorRate.previousPeriodTimeseries : undefined
            }
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
      render: (_, { impact, previousPeriodImpact }) => {
        return (
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={impact} size="m" />
            </EuiFlexItem>
            {comparisonEnabled && previousPeriodImpact !== undefined && (
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
          query: { start, end, environment, numBuckets: 20 },
        },
      });
    },
    [start, end, serviceName, environment]
  );

  // Fetches previous period dependencies
  const { data: previousPeriodData, status: previousPeriodStatus } = useFetcher(
    (callApmApi) => {
      if (!comparisonStart || !comparisonEnd) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
        params: {
          path: { serviceName },
          query: {
            start: comparisonStart,
            end: comparisonEnd,
            environment,
            numBuckets: 20,
          },
        },
      });
    },
    [comparisonStart, comparisonEnd, serviceName, environment]
  );

  const serviceDependencies = mergeCurrentAndPreviousPeriods({
    currentPeriod: data?.serviceDependencies,
    previousPeriod: previousPeriodData?.serviceDependencies,
  });

  // need top-level sortable fields for the managed table
  const items = serviceDependencies.map((item) => ({
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
              loading={
                status === FETCH_STATUS.LOADING ||
                previousPeriodStatus === FETCH_STATUS.LOADING
              }
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
