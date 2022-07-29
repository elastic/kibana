/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import {
  EuiFieldSearch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiProgress,
  EuiSpacer,
  EuiDataGridSorting,
  Pagination,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { IExecutionLog } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS, LOCKED_COLUMNS } from '../../../constants';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogDataGrid } from './rule_event_log_data_grid';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { RuleExecutionSummaryAndChartWithApi } from './rule_execution_summary_and_chart';
import { RuleActionErrorLogFlyout } from './rule_action_error_log_flyout';

import { RefineSearchPrompt } from '../refine_search_prompt';
import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { Rule, RuleSummary, RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.apiError',
  {
    defaultMessage: 'Failed to fetch execution history',
  }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.searchPlaceholder',
  {
    defaultMessage: 'Search event log message',
  }
);

const RULE_EVENT_LOG_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleEventLogList.initialColumns';

const getDefaultColumns = (columns: string[]) => {
  const columnsWithoutLockedColumn = columns.filter((column) => !LOCKED_COLUMNS.includes(column));
  return [...LOCKED_COLUMNS, ...columnsWithoutLockedColumn];
};

const updateButtonProps = {
  iconOnly: true,
  fill: false,
};

const MAX_RESULTS = 1000;

const ruleEventListContainerStyle = { minHeight: 400 };

export type RuleEventLogListOptions = 'stackManagement' | 'default';

export interface RuleEventLogListCommonProps {
  rule: Rule;
  ruleType: RuleType;
  localStorageKey?: string;
  refreshToken?: number;
  requestRefresh?: () => Promise<void>;
  loadExecutionLogAggregations?: RuleApis['loadExecutionLogAggregations'];
  fetchRuleSummary?: boolean;
}

export interface RuleEventLogListStackManagementProps {
  ruleSummary: RuleSummary;
  onChangeDuration: (duration: number) => void;
  numberOfExecutions: number;
  isLoadingRuleSummary?: boolean;
}

export type RuleEventLogListProps<T extends RuleEventLogListOptions = 'default'> =
  T extends 'default'
    ? RuleEventLogListCommonProps
    : T extends 'stackManagement'
    ? RuleEventLogListStackManagementProps & RuleEventLogListCommonProps
    : never;

export const RuleEventLogList = <T extends RuleEventLogListOptions>(
  props: RuleEventLogListProps<T>
) => {
  const {
    rule,
    ruleType,
    localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY,
    refreshToken,
    requestRefresh,
    fetchRuleSummary = true,
    loadExecutionLogAggregations,
  } = props;

  const {
    ruleSummary,
    numberOfExecutions,
    onChangeDuration,
    isLoadingRuleSummary = false,
  } = props as RuleEventLogListStackManagementProps;

  const { uiSettings, notifications } = useKibana().services;

  const [searchText, setSearchText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedRunLog, setSelectedRunLog] = useState<IExecutionLog | undefined>();

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return getDefaultColumns(
      JSON.parse(localStorage.getItem(localStorageKey) ?? 'null') ||
        RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS
    );
  });
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [filter, setFilter] = useState<string[]>([]);
  const [actualTotalItemCount, setActualTotalItemCount] = useState<number>(0);
  const [pagination, setPagination] = useState<Pagination>({
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 0,
  });

  // Date related states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dateStart, setDateStart] = useState<string>('now-24h');
  const [dateEnd, setDateEnd] = useState<string>('now');
  const [dateFormat] = useState(() => uiSettings?.get('dateFormat'));
  const [commonlyUsedRanges] = useState(() => {
    return (
      uiSettings
        ?.get('timepicker:quickRanges')
        ?.map(({ from, to, display }: { from: string; to: string; display: string }) => ({
          start: from,
          end: to,
          label: display,
        })) || []
    );
  });

  const isInitialized = useRef(false);

  const isOnLastPage = useMemo(() => {
    const { pageIndex, pageSize } = pagination;
    return (pageIndex + 1) * pageSize >= MAX_RESULTS;
  }, [pagination]);

  // Formats the sort columns to be consumed by the API endpoint
  const formattedSort = useMemo(() => {
    return sortingColumns.map(({ id: sortId, direction }) => ({
      [sortId]: {
        order: direction,
      },
    }));
  }, [sortingColumns]);

  const loadEventLogs = async () => {
    if (!loadExecutionLogAggregations) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadExecutionLogAggregations({
        id: rule.id,
        sort: formattedSort as LoadExecutionLogAggregationsProps['sort'],
        outcomeFilter: filter,
        message: searchText,
        dateStart: getParsedDate(dateStart),
        dateEnd: getParsedDate(dateEnd),
        page: pagination.pageIndex,
        perPage: pagination.pageSize,
      });
      setLogs(result.data);
      setPagination({
        ...pagination,
        totalItemCount: Math.min(result.total, MAX_RESULTS),
      });
      setActualTotalItemCount(result.total);
    } catch (e) {
      notifications.toasts.addDanger({
        title: API_FAILED_MESSAGE,
        text: e.body.message,
      });
    }
    setIsLoading(false);
  };

  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => {
      setPagination((prevPagination) => ({
        ...prevPagination,
        pageIndex: 0,
        pageSize,
      }));
    },
    [setPagination]
  );

  const onChangePage = useCallback(
    (pageIndex: number) => {
      setPagination((prevPagination) => ({
        ...prevPagination,
        pageIndex,
      }));
    },
    [setPagination]
  );

  const onTimeChange = useCallback(
    ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (isInvalid) {
        return;
      }
      setDateStart(start);
      setDateEnd(end);
    },
    [setDateStart, setDateEnd]
  );

  const onRefresh = () => {
    loadEventLogs();
  };

  const onFilterChange = useCallback(
    (newFilter: string[]) => {
      setPagination((prevPagination) => ({
        ...prevPagination,
        pageIndex: 0,
      }));
      setFilter(newFilter);
    },
    [setPagination, setFilter]
  );

  const onFlyoutOpen = useCallback((runLog: IExecutionLog) => {
    setIsFlyoutOpen(true);
    setSelectedRunLog(runLog);
  }, []);

  const onFlyoutClose = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedRunLog(undefined);
  }, []);

  const onSearchChange = useCallback(
    (e) => {
      if (e.target.value === '') {
        setSearchText('');
      }
      setSearch(e.target.value);
    },
    [setSearchText, setSearch]
  );

  const onKeyUp = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        setSearchText(search);
      }
    },
    [search, setSearchText]
  );

  const renderList = () => {
    if (!logs) {
      return <CenterJustifiedSpinner />;
    }
    return (
      <>
        {isLoading && (
          <EuiProgress size="xs" color="accent" data-test-subj="ruleEventLogListProgressBar" />
        )}
        <RuleEventLogDataGrid
          logs={logs}
          pagination={pagination}
          sortingColumns={sortingColumns}
          visibleColumns={visibleColumns}
          dateFormat={dateFormat}
          selectedRunLog={selectedRunLog}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onChangePage={onChangePage}
          onFlyoutOpen={onFlyoutOpen}
          onFilterChange={setFilter}
          setVisibleColumns={setVisibleColumns}
          setSortingColumns={setSortingColumns}
        />
      </>
    );
  };

  useEffect(() => {
    loadEventLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sortingColumns,
    dateStart,
    dateEnd,
    filter,
    pagination.pageIndex,
    pagination.pageSize,
    searchText,
  ]);

  useEffect(() => {
    if (isInitialized.current) {
      loadEventLogs();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(visibleColumns));
  }, [localStorageKey, visibleColumns]);

  return (
    <div style={ruleEventListContainerStyle} data-test-subj="ruleEventLogListContainer">
      <EuiSpacer />
      <RuleExecutionSummaryAndChartWithApi
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        numberOfExecutions={numberOfExecutions}
        isLoadingRuleSummary={isLoadingRuleSummary}
        refreshToken={refreshToken}
        onChangeDuration={onChangeDuration}
        requestRefresh={requestRefresh}
        fetchRuleSummary={fetchRuleSummary}
      />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            fullWidth
            isClearable
            value={search}
            onChange={onSearchChange}
            onKeyUp={onKeyUp}
            placeholder={SEARCH_PLACEHOLDER}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RuleEventLogListStatusFilter selectedOptions={filter} onChange={onFilterChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            data-test-subj="ruleEventLogListDatePicker"
            width="auto"
            isLoading={isLoading}
            start={dateStart}
            end={dateEnd}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            dateFormat={dateFormat}
            commonlyUsedRanges={commonlyUsedRanges}
            updateButtonProps={updateButtonProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {renderList()}
      {isOnLastPage && (
        <RefineSearchPrompt
          documentSize={actualTotalItemCount}
          visibleDocumentSize={MAX_RESULTS}
          backToTopAnchor="rule_event_log_list"
        />
      )}
      {isFlyoutOpen && selectedRunLog && (
        <RuleActionErrorLogFlyout
          rule={rule}
          runLog={selectedRunLog}
          refreshToken={refreshToken}
          onClose={onFlyoutClose}
        />
      )}
    </div>
  );
};

export const RuleEventLogListWithApi = withBulkRuleOperations(RuleEventLogList);

// eslint-disable-next-line import/no-default-export
export { RuleEventLogListWithApi as default };
