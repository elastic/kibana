/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiStat, EuiFlexGroup } from '@elastic/eui';
import numeral from '@elastic/numeral';
import {
  DATA_UNDEFINED_LABEL,
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

function formatTitle(unit: string, value?: number) {
  if (typeof value === 'undefined') return DATA_UNDEFINED_LABEL;
  return formatToSec(value, unit);
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
          title={formatTitle('ms', data?.fcp)}
          description={FCP_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', data?.tbt)}
          description={TBT_LABEL}
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={
            longTaskData?.noOfLongTasks
              ? numeral(longTaskData.noOfLongTasks).format('0,0')
              : DATA_UNDEFINED_LABEL
          }
          description={NO_OF_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', longTaskData?.longestLongTask)}
          description={LONGEST_LONG_TASK}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', longTaskData?.sumOfLongTasks)}
          description={SUM_LONG_TASKS}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
