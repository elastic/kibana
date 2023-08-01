/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { Summary } from './summary';

export function StorageExplorerView() {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery } = query;

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: {
      fetchStorageExplorerSummary,
      fetchStorageExplorerHostBreakdownSizeChart: fetchStorageExplorerHostBreakdown,
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
      return fetchStorageExplorerHostBreakdown({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      });
    },
    [fetchStorageExplorerHostBreakdown, timeRange.inSeconds.start, timeRange.inSeconds.end, kuery]
  );

  return (
    <ProfilingAppPageTemplate>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <Summary
            data={storageExplorerSummaryState.data}
            isLoading={storageExplorerSummaryState.status === AsyncStatus.Loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div>caue</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
