/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiStat, EuiFlexGroup } from '@elastic/eui';
import numeral from '@elastic/numeral';
import {
  FCP_LABEL,
  LONGEST_LONG_TASK,
  NO_OF_LONG_TASK,
  SUM_LONG_TASKS,
  TBT_LABEL,
} from './translations';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUxQuery } from '../hooks/useUxQuery';
import { UXMetrics } from '../../../../../../observability/public';

export function formatToSec(
  value?: number | string,
  fromUnit = 'MicroSec'
): string {
  const valueInMs = Number(value ?? 0) / (fromUnit === 'MicroSec' ? 1000 : 1);

  if (valueInMs < 1000) {
    return valueInMs.toFixed(0) + ' ms';
  }
  return (valueInMs / 1000).toFixed(2) + ' s';
}
const STAT_STYLE = { width: '240px' };

interface Props {
  data?: UXMetrics | null;
  loading: boolean;
}

export function KeyUXMetrics({ data, loading }: Props) {
  const uxQuery = useUxQuery();

  const { data: longTaskData, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery) {
        return callApmApi({
          pathname: '/api/apm/rum-client/long-task-metrics',
          params: {
            query: {
              ...uxQuery,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [uxQuery]
  );

  // Note: FCP value is in ms unit
  return (
    <EuiFlexGroup wrap>
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
          title={formatToSec(data?.tbt, 'ms')}
          description={TBT_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={numeral(longTaskData?.noOfLongTasks ?? 0).format('0,0')}
          description={NO_OF_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatToSec(longTaskData?.longestLongTask, 'ms')}
          description={LONGEST_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatToSec(longTaskData?.sumOfLongTasks, 'ms')}
          description={SUM_LONG_TASKS}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
