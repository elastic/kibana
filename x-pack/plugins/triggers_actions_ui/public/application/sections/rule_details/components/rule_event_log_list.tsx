/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@elastic/datemath';
import {
  EuiDataGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiDataGridSorting,
  Pagination,
  EuiSuperDatePicker,
  EuiDataGridCellValueElementProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogListCellRenderer } from './rule_event_log_list_cell_renderer';

import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { Rule } from '../../../../types';
import { IExecutionLog } from '../../../../../../alerting/common';
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

const SORTABLE_COLUMNS = [
  'timestamp',
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
  'num_triggered_actions',
];

const columns = [
  {
    id: 'id',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.id',
      {
        defaultMessage: 'Id',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('id'),
  },
  {
    id: 'timestamp',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timestamp',
      {
        defaultMessage: 'Timestamp',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('timestamp'),
  },
  {
    id: 'execution_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.duration',
      {
        defaultMessage: 'Duration',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('execution_duration'),
  },
  {
    id: 'status',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.status',
      {
        defaultMessage: 'Status',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('status'),
  },
  {
    id: 'message',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.message',
      {
        defaultMessage: 'Message',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('message'),
  },
  {
    id: 'num_active_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.activeAlerts',
      {
        defaultMessage: 'Active alerts',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_active_alerts'),
  },
  {
    id: 'num_new_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.newAlerts',
      {
        defaultMessage: 'New alerts',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_new_alerts'),
  },
  {
    id: 'num_recovered_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.recoveredAlerts',
      {
        defaultMessage: 'Recovered alerts',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_recovered_alerts'),
  },
  {
    id: 'num_triggered_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.triggeredActions',
      {
        defaultMessage: 'Triggered actions',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_triggered_actions'),
  },
  {
    id: 'num_succeeded_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.succeededActions',
      {
        defaultMessage: 'Succeeded actions',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_succeeded_actions'),
  },
  {
    id: 'num_errored_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.erroredActions',
      {
        defaultMessage: 'Errored actions',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('num_errored_actions'),
  },
  {
    id: 'total_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.totalSearchDuration',
      {
        defaultMessage: 'Total search duration',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('total_search_duration'),
  },
  {
    id: 'es_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.esSearchDuration',
      {
        defaultMessage: 'ES search duration',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('es_search_duration'),
  },
  {
    id: 'schedule_delay',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduleDelay',
      {
        defaultMessage: 'Schedule delay',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('schedule_delay'),
  },
  {
    id: 'timed_out',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timedOut',
      {
        defaultMessage: 'Timed out',
      }
    ),
    isSortable: SORTABLE_COLUMNS.includes('timed_out'),
  },
];

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.apiError',
  {
    defaultMessage: 'Failed to fetch execution history',
  }
);

const RULE_EVENT_LOG_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleEventLogList.initialColumns';

export const DEFAULT_INITIAL_VISIBLE_COLUMNS = ['timestamp', 'execution_duration', 'status', 'message'];

const PAGE_SIZE_OPTION = [10, 50, 100];

export type RuleEventLogListProps = {
  rule: Rule;
  localStorageKey?: string,
} & Pick<RuleApis, 'loadExecutionLogAggregations'>;

export const RuleEventLogList = (props: RuleEventLogListProps) => {
  const { 
    rule, 
    localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY,
    loadExecutionLogAggregations,
  } = props;

  const { uiSettings, notifications } = useKibana().services;

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return (
      JSON.parse(localStorage.getItem(localStorageKey) ?? 'null') ||
      DEFAULT_INITIAL_VISIBLE_COLUMNS
    );
  });
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [filter, setFilter] = useState<string[]>([]);
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

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const { pageIndex, pageSize } = pagination;
    const pagedRowIndex = rowIndex - pageIndex * pageSize;
    const value = logs?.[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;

    return (
      <RuleEventLogListCellRenderer columnId={columnId} value={value} dateFormat={dateFormat} />
    );
  };

  // Computed data grid props
  const sortingProps = useMemo(
    () => ({
      onSort: setSortingColumns,
      columns: sortingColumns,
    }),
    [sortingColumns]
  );

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
        totalItemCount: result.total,
      });
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

  const paginationProps = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: PAGE_SIZE_OPTION,
      onChangeItemsPerPage,
      onChangePage,
    }),
    [pagination, onChangeItemsPerPage, onChangePage]
  );

  const columnVisibilityProps = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns,
    }),
    [visibleColumns, setVisibleColumns]
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

  useEffect(() => {
    loadEventLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingColumns, dateStart, dateEnd, filter, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  return (
    <div>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={4}>
          {/* KQL search bar eventually goes here */}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <RuleEventLogListStatusFilter selectedOptions={filter} onChange={onFilterChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <EuiSuperDatePicker
            width="full"
            isLoading={isLoading}
            start={dateStart}
            end={dateEnd}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            dateFormat={dateFormat}
            commonlyUsedRanges={commonlyUsedRanges}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiDataGrid
        aria-label="rule execution log"
        columns={columns}
        rowCount={pagination.totalItemCount}
        renderCellValue={renderCell}
        columnVisibility={columnVisibilityProps}
        sorting={sortingProps}
        pagination={paginationProps}
      />
    </div>
  );
};

export const RuleEventLogListWithApi = withBulkRuleOperations(RuleEventLogList);
