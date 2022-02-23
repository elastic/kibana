/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import React, { useCallback, useState } from 'react';
import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBarProps,
  EuiSuperDatePicker,
  OnTimeChangeProps,
  OnRefreshProps,
  OnRefreshChangeProps,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';

import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../../common/components/utility_bar';
import { useRuleExecutionEvents } from '../../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import { EXECUTION_LOG_COLUMNS } from './execution_log_columns';
import { ExecutionLogSearchBar } from './execution_log_search_bar';

interface ExecutionLogTableProps {
  ruleId: string;
}

// TODO: Hoist to package and share with server in events_reader
const MAX_EXECUTION_EVENTS_DISPLAYED = 500;

const ExecutionLogTableComponent: React.FC<ExecutionLogTableProps> = ({ ruleId }) => {
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<DurationRange[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);
  const [start, setStart] = useState('now-30m');
  const [end, setEnd] = useState('now');
  const [filters, setFilters] = useState<string>('');

  const {
    data: events,
    isFetching,
    refetch,
  } = useRuleExecutionEvents({ ruleId, start, end, filters });
  const items = events?.events ?? [];
  const maxEvents = events?.maxEvents ?? 0;

  const onTimeChangeCallback = useCallback(
    (props: OnTimeChangeProps) => {
      const recentlyUsedRange = recentlyUsedRanges.filter((range) => {
        const isDuplicate = range.start === props.start && range.end === props.end;
        return !isDuplicate;
      });
      recentlyUsedRange.unshift({ start: props.start, end: props.end });
      setStart(props.start);
      setEnd(props.end);
      setRecentlyUsedRanges(
        recentlyUsedRange.length > 10 ? recentlyUsedRange.slice(0, 9) : recentlyUsedRange
      );
    },
    [recentlyUsedRanges]
  );

  const onRefreshChangeCallback = useCallback((props: OnRefreshChangeProps) => {
    setIsPaused(props.isPaused);
    setRefreshInterval(props.refreshInterval);
  }, []);

  const onRefreshCallback = useCallback(
    (props: OnRefreshProps) => {
      refetch();
    },
    [refetch]
  );

  const onSearchCallback = useCallback(
    ({ queryText }: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => {
      setFilters(queryText);
    },
    []
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem style={{ minWidth: '50%' }}>
          <ExecutionLogSearchBar onSearch={onSearchCallback} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div>
            <EuiSuperDatePicker
              start={start}
              end={end}
              onTimeChange={onTimeChangeCallback}
              onRefresh={onRefreshCallback}
              isPaused={isPaused}
              isLoading={isFetching}
              refreshInterval={refreshInterval}
              onRefreshChange={onRefreshChangeCallback}
              recentlyUsedRanges={recentlyUsedRanges}
              width="auto"
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="executionsShowing">
              {i18n.SHOWING_EXECUTIONS(items.length)}
            </UtilityBarText>
          </UtilityBarGroup>
          {maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED && (
            <UtilityBarGroup>
              <UtilityBarText dataTestSubj="exceptionsShowing">
                <EuiTextColor color="danger">
                  {i18n.RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED(maxEvents)}
                </EuiTextColor>
              </UtilityBarText>
            </UtilityBarGroup>
          )}
        </UtilityBarSection>
      </UtilityBar>
      <EuiInMemoryTable
        columns={EXECUTION_LOG_COLUMNS}
        items={items}
        loading={isFetching}
        pagination={true}
        sorting={{ sort: { field: '@timestamp', direction: 'desc' } }}
      />
    </>
  );
};

export const ExecutionLogTable = React.memo(ExecutionLogTableComponent);
ExecutionLogTable.displayName = 'ExecutionLogTable';
