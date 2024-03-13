/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { GroupedIndexDetailsChart } from './grouped_index_details_chart';
import { GroupedIndexDetails } from './grouped_index_details';
import { StorageDetailsTable } from './storage_details_table';
import { useProfilingParams } from '../../../hooks/use_profiling_params';

export function DataBreakdown() {
  const theme = useEuiTheme();
  const { query } = useProfilingParams('/storage-explorer');
  const { indexLifecyclePhase } = query;
  const {
    services: { fetchStorageExplorerIndicesStorageDetails },
  } = useProfilingDependencies();

  const indicesStorageDetails = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerIndicesStorageDetails({ http, indexLifecyclePhase });
    },
    [fetchStorageExplorerIndicesStorageDetails, indexLifecyclePhase]
  );

  return (
    <>
      <EuiTitle>
        <EuiText>
          {i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.title', {
            defaultMessage: 'Data breakdown',
          })}
        </EuiText>
      </EuiTitle>
      <EuiSpacer />
      <EuiPanel hasShadow={false} hasBorder>
        <AsyncComponent size="xl" {...indicesStorageDetails} style={{ height: 400 }}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="none">
                <EuiFlexItem>
                  <GroupedIndexDetailsChart
                    data={indicesStorageDetails.data?.storageDetailsGroupedByIndex}
                  />
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                  style={{
                    width: theme.euiTheme.border.width.thin,
                    backgroundColor: theme.euiTheme.border.color,
                    marginLeft: 64,
                    marginRight: 64,
                  }}
                />
                <EuiFlexItem>
                  <GroupedIndexDetails
                    data={indicesStorageDetails.data?.storageDetailsGroupedByIndex}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <StorageDetailsTable data={indicesStorageDetails.data?.storageDetailsPerIndex} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </AsyncComponent>
      </EuiPanel>
    </>
  );
}
