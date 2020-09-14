/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiStat, EuiFlexGroup } from '@elastic/eui';
import { UXMetrics } from './index';
import {
  FCP_LABEL,
  LONGEST_LONG_TASK,
  NO_OF_LONG_TASK,
  SUM_LONG_TASKS,
  TBT_LABEL,
} from '../CoreVitals/translations';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

function formatMicroSecValue(value: number | string): string {
  const valueInMs = Number(value) / 1000;
  if (valueInMs < 1000) {
    return valueInMs + ' ms';
  }
  return valueInMs / 1000 + ' s';
}

interface Props {
  data?: UXMetrics | null;
  loading: boolean;
}

export function KeyUXMetrics({ data, loading }: Props) {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const { data: longTaskData, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/long-task-metrics',
          params: {
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters]
  );

  const STAT_STYLE = { width: '240px' };

  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatMicroSecValue(Number(data?.fcp ?? 0) * 1000)}
          description={FCP_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={(Number(data?.tbt ?? 0)?.toFixed(2) ?? '-') + ' s'}
          description={TBT_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={longTaskData?.noOfLongTasks ?? 0}
          description={NO_OF_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={
            ((longTaskData?.longestLongTask ?? 0) / 100000).toFixed(1) + ' s'
          }
          description={LONGEST_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={
            ((longTaskData?.sumOfLongTasks ?? 0) / 100000).toFixed(1) + ' s'
          }
          description={SUM_LONG_TASKS}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
