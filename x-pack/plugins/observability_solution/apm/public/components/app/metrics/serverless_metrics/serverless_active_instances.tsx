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
  euiPaletteColorBlind,
  EuiPanel,
  EuiTitle,
  PropertySort,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  asDynamicBytes,
  asInteger,
  asMillisecondDuration,
} from '../../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { TimeseriesChartWithContext } from '../../../shared/charts/timeseries_chart_with_context';
import { ListMetric } from '../../../shared/list_metric';
import { ServerlessFunctionNameLink } from './serverless_function_name_link';

type ServerlessActiveInstances =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances'>;

const palette = euiPaletteColorBlind({ rotations: 2 });

interface Props {
  serverlessId?: string;
}

export function ServerlessActiveInstances({ serverlessId }: Props) {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { serviceName } = useApmServiceContext();

  const { data = { activeInstances: [], timeseries: [] }, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              environment,
              start,
              end,
              serverlessId,
            },
          },
        }
      );
    },
    [kuery, environment, serviceName, start, end, serverlessId]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  const columns: Array<EuiBasicTableColumn<ServerlessActiveInstances['activeInstances'][0]>> = [
    {
      field: 'serverlessFunctionName',
      name: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.functionName', {
        defaultMessage: 'Function name',
      }),
      sortable: true,
      truncateText: true,
      render: (_, item) => {
        return (
          <ServerlessFunctionNameLink
            serverlessFunctionName={item.serverlessFunctionName}
            serverlessId={item.serverlessId}
          />
        );
      },
    },
    {
      field: 'activeInstanceName',
      name: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.name', {
        defaultMessage: 'Name',
      }),
      sortable: true,
    },
    {
      field: 'serverlessDurationAvg',
      name: i18n.translate('xpack.apm.serverlessMetrics.serverlessFunctions.functionDuration', {
        defaultMessage: 'Function duration',
      }),
      sortable: true,
      render: (_, { serverlessDurationAvg, timeseries }) => {
        return (
          <ListMetric
            isLoading={isLoading}
            series={timeseries.serverlessDuration}
            color={palette[1]}
            valueLabel={asMillisecondDuration(serverlessDurationAvg)}
          />
        );
      },
    },
    {
      field: 'billedDurationAvg',
      name: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.billedDuration', {
        defaultMessage: 'Billed duration',
      }),
      sortable: true,
      render: (_, { billedDurationAvg, timeseries }) => {
        return (
          <ListMetric
            isLoading={isLoading}
            series={timeseries.billedDuration}
            color={palette[2]}
            valueLabel={asMillisecondDuration(billedDurationAvg)}
          />
        );
      },
    },
    {
      field: 'avgMemoryUsed',
      name: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.memoryUsageAvg', {
        defaultMessage: 'Memory usage avg.',
      }),
      sortable: true,
      render: (_, { avgMemoryUsed }) => {
        return asDynamicBytes(avgMemoryUsed);
      },
    },
    {
      field: 'memorySize',
      name: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.memorySize', {
        defaultMessage: 'Memory size',
      }),
      sortable: true,
      render: (_, { memorySize }) => {
        return asDynamicBytes(memorySize);
      },
    },
  ];

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'serverlessDurationAvg',
        direction: 'desc',
      } as PropertySort,
    }),
    []
  );

  const charts: Array<TimeSeries<Coordinate>> = useMemo(
    () => [
      {
        title: i18n.translate('xpack.apm.serverlessMetrics.activeInstances.title', {
          defaultMessage: 'Active instances',
        }),
        data: data.timeseries,
        type: 'bar',
        color: palette[2],
      },
    ],
    [data.timeseries]
  );

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serverlessMetrics.activeInstances.title', {
                defaultMessage: 'Active instances',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <TimeseriesChartWithContext
            timeseries={charts}
            id="activeInstances"
            fetchStatus={status}
            yLabelFormat={asInteger}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiInMemoryTable
            loading={isLoading}
            items={data.activeInstances}
            columns={columns}
            pagination={{ showPerPageOptions: false, pageSize: 5 }}
            sorting={sorting}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
