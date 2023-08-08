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
import { AsyncComponent } from '../../components/async_component';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { DataBreakdownChart } from './data_breakdown_chart';
import { DataBreakdownIndicesSize } from './data_breakdown_indices_size';

export function DataBreakdown() {
  const theme = useEuiTheme();
  const {
    services: {
      fetchStorageExplorerIndicesDataBreakdownSize: fetchStorageExplorerDataBreakdownSize,
    },
  } = useProfilingDependencies();

  const storageExplorerDataBreakdownSize = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerDataBreakdownSize({ http });
    },
    [fetchStorageExplorerDataBreakdownSize]
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
        <AsyncComponent size="xl" {...storageExplorerDataBreakdownSize} style={{ height: 400 }}>
          <EuiFlexGroup direction="row" gutterSize="none">
            <EuiFlexItem>
              <DataBreakdownChart data={storageExplorerDataBreakdownSize.data} />
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
              <DataBreakdownIndicesSize data={storageExplorerDataBreakdownSize.data} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </AsyncComponent>
      </EuiPanel>
    </>
  );
}
