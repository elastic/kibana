/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { keyBy } from 'lodash';
import React, { useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useSearchServiceDestinationMetrics } from '../../../../context/time_range_metadata/use_search_service_destination_metrics';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { SpanMetricGroup } from '../../../shared/dependencies_table/get_span_metric_columns';
import { getSpanMetricColumns } from '../../../shared/dependencies_table/get_span_metric_columns';
import { EmptyMessage } from '../../../shared/empty_message';
import type { ITableColumn } from '../../../shared/managed_table';
import { ManagedTable } from '../../../shared/managed_table';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { DependencyOperationDetailLink } from '../../dependency_operation_detail_view/dependency_operation_detail_link';
import { TransactionTab } from '../../transaction_details/waterfall_with_summary/transaction_tabs';

interface OperationStatisticsItem extends SpanMetricGroup {
  spanName: string;
}

function OperationLink({ spanName }: { spanName: string }) {
  const { query } = useApmParams('/dependencies/operations');

  return (
    <TruncateWithTooltip
      data-test-subj="apmOperationsListAppLink"
      text={spanName}
      content={
        <DependencyOperationDetailLink
          {...query}
          spanName={spanName}
          detailTab={TransactionTab.timeline}
          showCriticalPath={false}
        />
      }
    />
  );
}

export function DependencyDetailOperationsList() {
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
  } = useApmParams('/dependencies/operations');
  const { onPageReady } = usePerformanceContext();
  const { core } = useApmPluginContext();

  const { isLarge } = useBreakpoints();
  const shouldShowSparkPlots = !isLarge;

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const comparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled,
  });

  const { searchServiceDestinationMetrics } = useSearchServiceDestinationMetrics({
    start,
    end,
    kuery,
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
            searchServiceDestinationMetrics,
          },
        },
      });
    },
    [dependencyName, start, end, environment, kuery, searchServiceDestinationMetrics]
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
            searchServiceDestinationMetrics,
          },
        },
      });
    },
    [
      dependencyName,
      start,
      end,
      offset,
      environment,
      kuery,
      comparisonEnabled,
      searchServiceDestinationMetrics,
    ]
  );

  useEffect(() => {
    if (
      comparisonStatsFetch.status === FETCH_STATUS.SUCCESS &&
      primaryStatsFetch.status === FETCH_STATUS.SUCCESS
    ) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
      });
    }
  }, [onPageReady, primaryStatsFetch, comparisonStatsFetch, rangeFrom, rangeTo]);

  const columns: Array<ITableColumn<OperationStatisticsItem>> = [
    {
      name: i18n.translate('xpack.apm.dependencyDetailOperationsList.spanNameColumnLabel', {
        defaultMessage: 'Span name',
      }),
      field: 'spanName',
      sortable: true,
      render: (_, { spanName }) => <OperationLink spanName={spanName} />,
    },
    ...getSpanMetricColumns({
      shouldShowSparkPlots,
      comparisonFetchStatus: comparisonStatsFetch.status,
    }),
  ];

  const comparisonOperationsBySpanName = keyBy(comparisonStatsFetch.data?.operations, 'spanName');

  const noItemsMessage = (
    <EmptyMessage
      heading={i18n.translate('xpack.apm.dependencyDetailOperationsList.notFoundLabel', {
        defaultMessage: 'No operations found',
      })}
    />
  );

  const items =
    primaryStatsFetch.data?.operations.map((operation): OperationStatisticsItem => {
      const comparisonOperation = comparisonOperationsBySpanName[operation.spanName];

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
    }) ?? [];

  return (
    <ManagedTable
      columns={columns}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSortField="impact"
      initialSortDirection="desc"
      isLoading={primaryStatsFetch.status === FETCH_STATUS.LOADING}
      initialPageSize={25}
    />
  );
}
