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

export function formatToSec(
  value?: number | string,
  fromUnit = 'MicroSec'
): string {
  const valueInMs = Number(value ?? 0) / (fromUnit === 'MicroSec' ? 1000 : 1);

  if (valueInMs < 1000) {
    return valueInMs + ' ms';
  }
  return (valueInMs / 1000).toFixed(2) + ' s';
}
const STAT_STYLE = { width: '240px' };

interface Props {
  data?: UXMetrics | null;
  loading: boolean;
}

export function KeyUXMetrics({ data, loading }: Props) {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName, searchTerm } = urlParams;

  const { data: longTaskData, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/long-task-metrics',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, searchTerm]
  );

  // Note: FCP value is in ms unit
  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatToSec(data?.fcp, 'ms')}
          description={FCP_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatToSec(data?.tbt)}
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
          title={formatToSec(longTaskData?.longestLongTask)}
          description={LONGEST_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatToSec(longTaskData?.sumOfLongTasks)}
          description={SUM_LONG_TASKS}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
