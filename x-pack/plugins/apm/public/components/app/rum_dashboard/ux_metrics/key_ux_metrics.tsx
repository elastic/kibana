/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiStat, EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import {
  DATA_UNDEFINED_LABEL,
  FCP_LABEL,
  FCP_TOOLTIP,
  LONGEST_LONG_TASK,
  LONGEST_LONG_TASK_TOOLTIP,
  NO_OF_LONG_TASK,
  NO_OF_LONG_TASK_TOOLTIP,
  SUM_LONG_TASKS,
  SUM_LONG_TASKS_TOOLTIP,
  TBT_LABEL,
  TBT_TOOLTIP,
} from './translations';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUxQuery } from '../hooks/use_ux_query';
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
const STAT_STYLE = { width: '200px' };

interface Props {
  data?: UXMetrics | null;
  loading: boolean;
}

function formatTitle(unit: string, value?: number | null) {
  if (typeof value === 'undefined' || value === null)
    return DATA_UNDEFINED_LABEL;
  return formatToSec(value, unit);
}

export function KeyUXMetrics({ data, loading }: Props) {
  const uxQuery = useUxQuery();

  const { data: longTaskData, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery) {
        return callApmApi('GET /internal/apm/ux/long-task-metrics', {
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
    <EuiFlexGroup wrap responsive={false}>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', data?.fcp)}
          description={
            <>
              {FCP_LABEL}
              <EuiIconTip content={FCP_TOOLTIP} type="questionInCircle" />
            </>
          }
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', data?.tbt)}
          description={
            <>
              {TBT_LABEL}
              <EuiIconTip content={TBT_TOOLTIP} type="questionInCircle" />
            </>
          }
          isLoading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={
            longTaskData?.noOfLongTasks !== undefined
              ? numeral(longTaskData?.noOfLongTasks).format('0,0')
              : DATA_UNDEFINED_LABEL
          }
          description={
            <>
              {NO_OF_LONG_TASK}
              <EuiIconTip
                content={NO_OF_LONG_TASK_TOOLTIP}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', longTaskData?.longestLongTask)}
          description={
            <>
              {LONGEST_LONG_TASK}
              <EuiIconTip
                content={LONGEST_LONG_TASK_TOOLTIP}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatTitle('ms', longTaskData?.sumOfLongTasks)}
          description={
            <>
              {SUM_LONG_TASKS}
              <EuiIconTip
                content={SUM_LONG_TASKS_TOOLTIP}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
