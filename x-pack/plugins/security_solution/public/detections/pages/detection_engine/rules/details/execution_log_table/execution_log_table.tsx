/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import styled from 'styled-components';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  OnTimeChangeProps,
  OnRefreshProps,
  OnRefreshChangeProps,
  EuiSpacer,
  EuiSwitch,
  EuiBasicTable,
} from '@elastic/eui';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY } from '../../../../../../../common/constants';
import { AggregateRuleExecutionEvent } from '../../../../../../../common/detection_engine/schemas/common';

import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../../common/components/utility_bar';
import { useSourcererDataView } from '../../../../../../common/containers/sourcerer';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SourcererScopeName } from '../../../../../../common/store/sourcerer/model';
import { useRuleExecutionEvents } from '../../../../../containers/detection_engine/rules';
import * as i18n from './translations';
import { EXECUTION_LOG_COLUMNS, GET_EXECUTION_LOG_METRICS_COLUMNS } from './execution_log_columns';
import { ExecutionLogSearchBar } from './execution_log_search_bar';

const EXECUTION_UUID_FIELD_NAME = 'kibana.alert.rule.execution.uuid';

const UtilitySwitch = styled(EuiSwitch)`
  margin-left: 17px;
`;

const DatePickerEuiFlexItem = styled(EuiFlexItem)`
  max-width: 582px;
`;

interface ExecutionLogTableProps {
  ruleId: string;
  selectAlertsTab: () => void;
}

const ExecutionLogTableComponent: React.FC<ExecutionLogTableProps> = ({
  ruleId,
  selectAlertsTab,
}) => {
  const {
    docLinks,
    data: {
      query: { filterManager },
    },
    storage,
    timelines,
  } = useKibana().services;
  // Datepicker state
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<DurationRange[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);
  const [start, setStart] = useState('now-24h');
  const [end, setEnd] = useState('now');

  // Searchbar/Filter/Settings state
  const [queryText, setQueryText] = useState('');
  const [statusFilters, setStatusFilters] = useState<string | undefined>(undefined);
  const [showMetricColumns, setShowMetricColumns] = useState<boolean>(
    storage.get(RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY) ?? false
  );

  // Pagination state
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof AggregateRuleExecutionEvent>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');
  // Index for `add filter` action and toasts for errors
  const { indexPattern } = useSourcererDataView(SourcererScopeName.detections);
  const { addError, addSuccess } = useAppToasts();

  // Table data state
  const {
    data: events,
    dataUpdatedAt,
    isFetching,
    isLoading,
    refetch,
  } = useRuleExecutionEvents({
    ruleId,
    start,
    end,
    queryText,
    statusFilters,
    page: pageIndex,
    perPage: pageSize,
    sortField,
    sortOrder: sortDirection,
  });
  const items = events?.events ?? [];
  const maxEvents = events?.total ?? 0;

  // Cache UUID field from data view as it can be expensive to iterate all data view fields
  const uuidDataViewField = useMemo(() => {
    return indexPattern.fields.find((f) => f.name === EXECUTION_UUID_FIELD_NAME);
  }, [indexPattern]);

  // Callbacks
  const onTableChangeCallback = useCallback(({ page = {}, sort = {} }) => {
    const { index, size } = page;
    const { field, direction } = sort;

    setPageIndex(index + 1);
    setPageSize(size);
    setSortField(field);
    setSortDirection(direction);
  }, []);

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
    // Only support auto-refresh >= 1minute -- no current ability to limit within component
    setRefreshInterval(props.refreshInterval > 60000 ? props.refreshInterval : 60000);
  }, []);

  const onRefreshCallback = useCallback(
    (props: OnRefreshProps) => {
      refetch();
    },
    [refetch]
  );

  const onSearchCallback = useCallback((updatedQueryText: string) => {
    setQueryText(updatedQueryText);
  }, []);

  const onStatusFilterChangeCallback = useCallback((updatedStatusFilters: string[]) => {
    setStatusFilters(
      updatedStatusFilters.length ? updatedStatusFilters.sort().join(',') : undefined
    );
  }, []);

  const onFilterByExecutionIdCallback = useCallback(
    (executionId: string, executionStart: string) => {
      if (uuidDataViewField != null) {
        const filter = buildFilter(
          indexPattern,
          uuidDataViewField,
          FILTERS.PHRASE,
          false,
          false,
          executionId,
          null
        );
        filterManager.removeAll();
        filterManager.addFilters(filter);
        selectAlertsTab();
        addSuccess({
          title: i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_TITLE,
          text: i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_DESCRIPTION,
        });
      } else {
        addError(i18n.ACTIONS_FIELD_NOT_FOUND_ERROR, {
          title: i18n.ACTIONS_FIELD_NOT_FOUND_ERROR_TITLE,
        });
      }
    },
    [addError, addSuccess, filterManager, indexPattern, selectAlertsTab, uuidDataViewField]
  );

  const onShowMetricColumnsCallback = useCallback(
    (showMetrics: boolean) => {
      storage.set(RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY, showMetrics);
      setShowMetricColumns(showMetrics);
    },
    [storage]
  );

  // Memoized state
  const pagination = useMemo(() => {
    return {
      pageIndex: pageIndex - 1,
      pageSize,
      totalItemCount:
        maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED ? MAX_EXECUTION_EVENTS_DISPLAYED : maxEvents,
      pageSizeOptions: [5, 10, 25, 50],
    };
  }, [maxEvents, pageIndex, pageSize]);

  const sorting = useMemo(() => {
    return {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };
  }, [sortDirection, sortField]);

  // TODO: Re-add actions once alert count is displayed in table and UX is finalized
  // @ts-expect-error unused constant
  const actions = useMemo(
    () => [
      {
        field: EXECUTION_UUID_FIELD_NAME,
        name: i18n.COLUMN_ACTIONS,
        width: '5%',
        actions: [
          {
            name: 'Edit',
            isPrimary: true,
            field: '',
            description: i18n.COLUMN_ACTIONS_TOOLTIP,
            icon: 'filter',
            type: 'icon',
            onClick: (executionEvent: AggregateRuleExecutionEvent) => {
              if (executionEvent?.execution_uuid) {
                onFilterByExecutionIdCallback(
                  executionEvent.execution_uuid,
                  executionEvent.timestamp
                );
              }
            },
            'data-test-subj': 'action-filter-by-execution-id',
          },
        ],
      },
    ],
    [onFilterByExecutionIdCallback]
  );

  const executionLogColumns = useMemo(
    () =>
      showMetricColumns
        ? [...EXECUTION_LOG_COLUMNS, ...GET_EXECUTION_LOG_METRICS_COLUMNS(docLinks)]
        : [...EXECUTION_LOG_COLUMNS],
    [docLinks, showMetricColumns]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <ExecutionLogSearchBar
            onSearch={onSearchCallback}
            onStatusFilterChange={onStatusFilterChangeCallback}
            onlyShowFilters={true}
          />
        </EuiFlexItem>
        <DatePickerEuiFlexItem>
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
            width="full"
          />
        </DatePickerEuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="executionsShowing">
              {i18n.SHOWING_EXECUTIONS(
                maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED
                  ? MAX_EXECUTION_EVENTS_DISPLAYED
                  : maxEvents
              )}
            </UtilityBarText>
          </UtilityBarGroup>
          {maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED && (
            <UtilityBarGroup grow={true}>
              <UtilityBarText dataTestSubj="exceptionsShowing" shouldWrap={true}>
                <EuiTextColor color="danger">
                  {i18n.RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED(
                    maxEvents,
                    MAX_EXECUTION_EVENTS_DISPLAYED
                  )}
                </EuiTextColor>
              </UtilityBarText>
            </UtilityBarGroup>
          )}
        </UtilityBarSection>
        <UtilityBarSection>
          <UtilityBarText dataTestSubj="executionsShowing">
            {timelines.getLastUpdated({
              showUpdating: isLoading || isFetching,
              updatedAt: dataUpdatedAt,
            })}
          </UtilityBarText>
          <UtilitySwitch
            label={i18n.RULE_EXECUTION_LOG_SHOW_METRIC_COLUMNS_SWITCH}
            checked={showMetricColumns}
            compressed={true}
            onChange={(e) => onShowMetricColumnsCallback(e.target.checked)}
          />
        </UtilityBarSection>
      </UtilityBar>
      <EuiBasicTable
        columns={executionLogColumns}
        items={items}
        loading={isFetching}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChangeCallback}
      />
    </>
  );
};

export const ExecutionLogTable = React.memo(ExecutionLogTableComponent);
ExecutionLogTable.displayName = 'ExecutionLogTable';
