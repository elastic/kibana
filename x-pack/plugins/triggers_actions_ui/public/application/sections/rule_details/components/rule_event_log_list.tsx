/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import {
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
import { RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS } from '../../../constants';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogDataGrid } from './rule_event_log_data_grid';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

import { RefineSearchPrompt } from '../refine_search_prompt';
import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { Rule } from '../../../../types';
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

const RULE_EVENT_LOG_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleEventLogList.initialColumns';

const updateButtonProps = {
  iconOnly: true,
  fill: false,
};

const MAX_RESULTS = 1000;

const ruleEventListContainerStyle = { minHeight: 400 };

export type RuleEventLogListProps = {
  rule: Rule;
  localStorageKey?: string;
  refreshToken?: number;
  requestRefresh?: () => Promise<void>;
  customLoadExecutionLogAggregations?: RuleApis['loadExecutionLogAggregations'];
} & Pick<RuleApis, 'loadExecutionLogAggregations'>;

export const RuleEventLogList = (props: RuleEventLogListProps) => {
  const { rule, localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY, refreshToken } = props;

  const loadExecutionLogAggregations =
    props.customLoadExecutionLogAggregations || props.loadExecutionLogAggregations;

  const { uiSettings, notifications } = useKibana().services;

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return (
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

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

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
    setIsLoading(true);
    try {
      const result = await loadExecutionLogAggregations({
        id: rule.id,
        sort: formattedSort as LoadExecutionLogAggregationsProps['sort'],
        filter,
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
      setIsInitialized(true);
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

  const renderList = () => {
    if (!isInitialized) {
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
          onChangeItemsPerPage={onChangeItemsPerPage}
          onChangePage={onChangePage}
          setVisibleColumns={setVisibleColumns}
          setSortingColumns={setSortingColumns}
        />
      </>
    );
  };

  useEffect(() => {
    loadEventLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingColumns, dateStart, dateEnd, filter, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (isInitialized) {
      loadEventLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, isInitialized]);

  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(visibleColumns));
  }, [localStorageKey, visibleColumns]);

  return (
    <div style={ruleEventListContainerStyle}>
      <EuiSpacer />
      <EuiFlexGroup>
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
    </div>
  );
};

export const RuleEventLogListWithApi = withBulkRuleOperations(RuleEventLogList);

// eslint-disable-next-line import/no-default-export
export { RuleEventLogListWithApi as default };
