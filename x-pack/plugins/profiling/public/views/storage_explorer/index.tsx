/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AsyncComponent } from '../../components/async_component';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { HostsTable } from './hosts_table';
import { HostBreakdownChart } from './host_breakdown_chart';
import { Summary } from './summary';

export function StorageExplorerView() {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery } = query;

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: {
      fetchStorageExplorerSummary,
      fetchStorageExplorerHostBreakdownSizeChart,
      fetchStorageExplorerHostsDetails,
    },
  } = useProfilingDependencies();

  const storageExplorerSummaryState = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerSummary({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      });
    },
    [fetchStorageExplorerSummary, timeRange.inSeconds.start, timeRange.inSeconds.end, kuery]
  );

  const storageExplorerHostBreakdownState = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerHostBreakdownSizeChart({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      });
    },
    [
      fetchStorageExplorerHostBreakdownSizeChart,
      timeRange.inSeconds.start,
      timeRange.inSeconds.end,
      kuery,
    ]
  );

  const storageExplorerHostsDetails = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerHostsDetails({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      });
    },
    [fetchStorageExplorerHostsDetails, timeRange.inSeconds.start, timeRange.inSeconds.end, kuery]
  );

  const totalNumberOfDistinctProbabilisticValues =
    storageExplorerSummaryState.data?.totalNumberOfDistinctProbabilisticValues || 0;
  const hasDistinctProbabilisticValues = totalNumberOfDistinctProbabilisticValues > 1;

  return (
    <ProfilingAppPageTemplate>
      <EuiFlexGroup direction="column">
        {hasDistinctProbabilisticValues && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              title={i18n.translate(
                'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.title',
                {
                  defaultMessage:
                    "We've identified {count} distinct profiling values. Make sure to update them.",
                  values: { count: totalNumberOfDistinctProbabilisticValues },
                }
              )}
              color="warning"
              iconType="warning"
            >
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.description',
                  {
                    defaultMessage:
                      'We recommend using a consistent probabilistic value for each project for more efficient storage, cost management, and to maintain good statistical accuracy.',
                  }
                )}
              </EuiText>
              <EuiSpacer />
              {/* TODO: define href */}
              <EuiButton href="#" color="warning">
                {i18n.translate(
                  'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.button',
                  { defaultMessage: 'Learn how' }
                )}
              </EuiButton>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <Summary
            data={storageExplorerSummaryState.data}
            isLoading={storageExplorerSummaryState.status === AsyncStatus.Loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AsyncComponent size="xl" {...storageExplorerHostBreakdownState} style={{ height: 400 }}>
            <HostBreakdownChart data={storageExplorerHostBreakdownState.data} />
          </AsyncComponent>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AsyncComponent size="xl" {...storageExplorerHostsDetails} style={{ height: 400 }}>
            <HostsTable
              data={storageExplorerHostsDetails.data}
              hasDistinctProbabilisticValues={hasDistinctProbabilisticValues}
            />
          </AsyncComponent>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
