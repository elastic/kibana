/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { DataBreakdown } from './data_breakdown';
import { DistinctProbabilisticValuesWarning } from './distinct_probabilistic_values_warning';
import { HostBreakdown } from './host_breakdown';
import { Summary } from './summary';

export function StorageExplorerView() {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery } = query;
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const [selectedTab, setSelectedTab] = useState<'host_breakdown' | 'data_breakdown'>(
    'host_breakdown'
  );

  const {
    services: { fetchStorageExplorerSummary },
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

  const totalNumberOfDistinctProbabilisticValues =
    storageExplorerSummaryState.data?.totalNumberOfDistinctProbabilisticValues || 0;
  const hasDistinctProbabilisticValues = totalNumberOfDistinctProbabilisticValues > 1;

  return (
    <ProfilingAppPageTemplate>
      <EuiFlexGroup direction="column">
        {hasDistinctProbabilisticValues && (
          <EuiFlexItem grow={false}>
            <DistinctProbabilisticValuesWarning
              totalNumberOfDistinctProbabilisticValues={totalNumberOfDistinctProbabilisticValues}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <Summary
            data={storageExplorerSummaryState.data}
            isLoading={storageExplorerSummaryState.status === AsyncStatus.Loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTabs>
            <EuiTab
              onClick={() => {
                setSelectedTab('host_breakdown');
              }}
              isSelected={selectedTab === 'host_breakdown'}
            >
              {i18n.translate('xpack.profiling.storageExplorer.tabs.hostBreakdown', {
                defaultMessage: 'Host breakdown',
              })}
            </EuiTab>
            <EuiTab
              onClick={() => {
                setSelectedTab('data_breakdown');
              }}
              isSelected={selectedTab === 'data_breakdown'}
            >
              {i18n.translate('xpack.profiling.storageExplorer.tabs.dataBreakdown', {
                defaultMessage: 'Data breakdown',
              })}
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        {selectedTab === 'host_breakdown' ? (
          <EuiFlexItem grow={false}>
            <HostBreakdown hasDistinctProbabilisticValues={hasDistinctProbabilisticValues} />
          </EuiFlexItem>
        ) : null}
        {selectedTab === 'data_breakdown' ? (
          <EuiFlexItem grow={false}>
            <DataBreakdown />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
