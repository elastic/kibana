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
import {
  RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  LOCKED_COLUMNS,
} from '../../../constants';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogDataGrid } from './rule_event_log_data_grid';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { RuleActionErrorLogFlyout } from './rule_action_error_log_flyout';
import { RefineSearchPrompt } from '../refine_search_prompt';
import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { RuleEventLogListKPIWithApi as RuleEventLogListKPI } from './rule_event_log_list_kpi';
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

export type RuleEventLogListOptions = 'stackManagement' | 'default';

export type RuleEventLogListCommonProps = {
  ruleId: string;
  localStorageKey?: string;
  refreshToken?: number;
  initialPageSize?: number;
  // Duplicating these properties is extremely silly but it's the only way to get Jest to cooperate with the way this component is structured
  overrideLoadExecutionLogAggregations?: RuleApis['loadExecutionLogAggregations'];
  overrideLoadGlobalExecutionLogAggregations?: RuleApis['loadGlobalExecutionLogAggregations'];
  hasRuleNames?: boolean;
} & Pick<RuleApis, 'loadExecutionLogAggregations' | 'loadGlobalExecutionLogAggregations'>;

export type RuleEventLogListTableProps<T extends RuleEventLogListOptions = 'default'> =
  T extends 'default'
    ? RuleEventLogListCommonProps
    : T extends 'stackManagement'
    ? RuleEventLogListCommonProps
    : never;

export const RuleEventLogListTable = <T extends RuleEventLogListOptions>(
  props: RuleEventLogListTableProps<T>
) => {
  const {
    ruleId,
    localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY,
    refreshToken,
    loadGlobalExecutionLogAggregations,
    loadExecutionLogAggregations,
    overrideLoadGlobalExecutionLogAggregations,
    overrideLoadExecutionLogAggregations,
    initialPageSize = 10,
    hasRuleNames = false,
  } = props;

  const { uiSettings, notifications } = useKibana().services;

  const [searchText, setSearchText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedRunLog, setSelectedRunLog] = useState<IExecutionLog | undefined>();
  const [internalRefreshToken, setInternalRefreshToken] = useState<number | undefined>(
    refreshToken
  );

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return getDefaultColumns(
      JSON.parse(localStorage.getItem(localStorageKey) ?? 'null') || hasRuleNames
        ? GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS
        : RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS
    );
  });
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [filter, setFilter] = useState<string[]>([]);
  const [actualTotalItemCount, setActualTotalItemCount] = useState<number>(0);
  const [pagination, setPagination] = useState<Pagination>({
    pageIndex: 0,
    pageSize: initialPageSize,
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

  const loadLogsFn = useMemo(() => {
    if (ruleId === '*') {
      return overrideLoadGlobalExecutionLogAggregations ?? loadGlobalExecutionLogAggregations;
    }
    return overrideLoadExecutionLogAggregations ?? loadExecutionLogAggregations;
  }, [
    ruleId,
    overrideLoadExecutionLogAggregations,
    overrideLoadGlobalExecutionLogAggregations,
    loadExecutionLogAggregations,
    loadGlobalExecutionLogAggregations,
  ]);

  const loadEventLogs = async () => {
    if (!loadLogsFn) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadLogsFn({
        id: ruleId,
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
        text: e.body?.message ?? e,
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
    setInternalRefreshToken(Date.now());
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
          showRuleNameAndIdColumns={hasRuleNames}
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

  useEffect(() => {
    setInternalRefreshToken(refreshToken);
  }, [refreshToken]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RuleEventLogListKPI
          ruleId={ruleId}
          dateStart={dateStart}
          dateEnd={dateEnd}
          outcomeFilter={filter}
          message={searchText}
          refreshToken={internalRefreshToken}
        />
        <EuiSpacer />
      </EuiFlexItem>
      <EuiFlexItem>
        {renderList()}
        {isOnLastPage && (
          <RefineSearchPrompt
            documentSize={actualTotalItemCount}
            visibleDocumentSize={MAX_RESULTS}
            backToTopAnchor="rule_event_log_list"
          />
        )}
      </EuiFlexItem>
      {isFlyoutOpen && selectedRunLog && (
        <RuleActionErrorLogFlyout
          runLog={selectedRunLog}
          refreshToken={refreshToken}
          onClose={onFlyoutClose}
        />
      )}
    </EuiFlexGroup>
  );
};

export const RuleEventLogListTableWithApi = withBulkRuleOperations(RuleEventLogListTable);

// eslint-disable-next-line import/no-default-export
export { RuleEventLogListTableWithApi as default };
