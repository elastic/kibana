/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { keyBy } from 'lodash';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import {
  getSpanMetricColumns,
  SpanMetricGroup,
} from '../../../shared/dependencies_table/get_span_metric_columns';
import { EmptyMessage } from '../../../shared/empty_message';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { BackendOperationDetailLink } from '../../backend_operation_detail_view/backend_operation_detail_link';

interface OperationStatisticsItem extends SpanMetricGroup {
  spanName: string;
}

function OperationLink({ spanName }: { spanName: string }) {
  const { query } = useApmParams('/backends/operations');

  return (
    <TruncateWithTooltip
      data-test-subj="apmOperationsListAppLink"
      text={spanName}
      content={<BackendOperationDetailLink {...query} spanName={spanName} />}
    />
  );
}

export function BackendDetailOperationsList() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      dependencyName,
      environment,
      kuery,
      comparisonEnabled: urlComparisonEnabled,
      offset,
    },
  } = useApmParams('/backends/operations');

  const { core } = useApmPluginContext();

  const breakpoints = useBreakpoints();

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const comparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled,
  });

  const primaryStatsFetch = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/dependencies/operations', {
        params: {
          query: {
            dependencyName,
            start,
            end,
            environment,
            kuery,
          },
        },
      });
    },
    [dependencyName, start, end, environment, kuery]
  );

  const comparisonStatsFetch = useFetcher(
    (callApmApi) => {
      if (!comparisonEnabled) {
        return Promise.resolve({
          operations: [],
        });
      }
      return callApmApi('GET /internal/apm/dependencies/operations', {
        params: {
          query: {
            dependencyName,
            start,
            end,
            offset,
            environment,
            kuery,
          },
        },
      });
    },
    [dependencyName, start, end, offset, environment, kuery, comparisonEnabled]
  );

  const columns: Array<ITableColumn<OperationStatisticsItem>> = [
    {
      name: i18n.translate(
        'xpack.apm.backendDetailOperationsList.spanNameColumnLabel',
        {
          defaultMessage: 'Span name',
        }
      ),
      field: 'spanName',
      sortable: true,
      render: (_, { spanName }) => <OperationLink spanName={spanName} />,
    },
    ...getSpanMetricColumns({
      breakpoints,
      comparisonFetchStatus: comparisonStatsFetch.status,
    }),
  ];

  const comparisonOperationsBySpanName = keyBy(
    comparisonStatsFetch.data?.operations,
    'spanName'
  );

  const noItemsMessage = (
    <EmptyMessage
      heading={i18n.translate(
        'xpack.apm.backendDetailOperationsList.notFoundLabel',
        {
          defaultMessage: 'No operations found',
        }
      )}
    />
  );

  const items =
    primaryStatsFetch.data?.operations.map(
      (operation): OperationStatisticsItem => {
        const comparisonOperation =
          comparisonOperationsBySpanName[operation.spanName];

        return {
          spanName: operation.spanName,
          latency: operation.latency,
          throughput: operation.throughput,
          failureRate: operation.failureRate,
          impact: operation.impact,
          currentStats: {
            latency: operation.timeseries.latency,
            throughput: operation.timeseries.throughput,
            failureRate: operation.timeseries.failureRate,
          },
          previousStats: comparisonOperation
            ? {
                latency: comparisonOperation.timeseries.latency,
                throughput: comparisonOperation.timeseries.throughput,
                failureRate: comparisonOperation.timeseries.failureRate,
                impact: comparisonOperation.impact,
              }
            : undefined,
        };
      }
    ) ?? [];

  return (
    <ManagedTable
      columns={columns}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSortField="impact"
      initialSortDirection="desc"
      isLoading={primaryStatsFetch.status === FETCH_STATUS.LOADING}
    />
  );
}
