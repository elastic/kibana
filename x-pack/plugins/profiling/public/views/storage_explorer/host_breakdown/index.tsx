/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { HostsTable } from './hosts_table';
import { HostBreakdownChart } from './host_breakdown_chart';

interface Props {
  hasDistinctProbabilisticValues: boolean;
}

export function HostBreakdown({ hasDistinctProbabilisticValues }: Props) {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery } = query;
  const timeRange = useTimeRange({ rangeFrom, rangeTo });
  const {
    services: { fetchStorageExplorerHostBreakdownSizeChart, fetchStorageExplorerHostsDetails },
  } = useProfilingDependencies();

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
  return (
    <EuiFlexGroup direction="column">
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
  );
}
