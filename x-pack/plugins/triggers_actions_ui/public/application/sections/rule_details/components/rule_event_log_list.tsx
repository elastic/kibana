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
  EuiDataGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiProgress,
  EuiSpacer,
  EuiDataGridSorting,
  Pagination,
  EuiSuperDatePicker,
  EuiDataGridCellValueElementProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS } from '../../../constants';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogListCellRenderer, ColumnId } from './rule_event_log_list_cell_renderer';

import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { Rule } from '../../../../types';
import {
  IExecutionLog,
  executionLogSortableColumns,
  ExecutionLogSortFields,
} from '../../../../../../alerting/common';
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

const getIsColumnSortable = (columnId: string) => {
  return executionLogSortableColumns.includes(columnId as ExecutionLogSortFields);
};

const columns = [
  {
    id: 'id',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.id',
      {
        defaultMessage: 'Id',
      }
    ),
    isSortable: getIsColumnSortable('id'),
  },
  {
    id: 'timestamp',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timestamp',
      {
        defaultMessage: 'Timestamp',
      }
    ),
    isSortable: getIsColumnSortable('timestamp'),
    initialWidth: 250,
  },
  {
    id: 'execution_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.duration',
      {
        defaultMessage: 'Duration',
      }
    ),
    isSortable: getIsColumnSortable('execution_duration'),
    initialWidth: 100,
  },
  {
    id: 'status',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.status',
      {
        defaultMessage: 'Status',
      }
    ),
    isSortable: getIsColumnSortable('status'),
    initialWidth: 100,
  },
  {
    id: 'message',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.message',
      {
        defaultMessage: 'Message',
      }
    ),
    isSortable: getIsColumnSortable('message'),
  },
  {
    id: 'num_active_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.activeAlerts',
      {
        defaultMessage: 'Active alerts',
      }
    ),
    isSortable: getIsColumnSortable('num_active_alerts'),
  },
  {
    id: 'num_new_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.newAlerts',
      {
        defaultMessage: 'New alerts',
      }
    ),
    isSortable: getIsColumnSortable('num_new_alerts'),
  },
  {
    id: 'num_recovered_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.recoveredAlerts',
      {
        defaultMessage: 'Recovered alerts',
      }
    ),
    isSortable: getIsColumnSortable('num_recovered_alerts'),
  },
  {
    id: 'num_triggered_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.triggeredActions',
      {
        defaultMessage: 'Triggered actions',
      }
    ),
    isSortable: getIsColumnSortable('num_triggered_actions'),
  },
  {
    id: 'num_scheduled_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduledActions',
      {
        defaultMessage: 'Scheduled actions',
      }
    ),
    isSortable: getIsColumnSortable('num_scheduled_actions'),
  },
  {
    id: 'num_succeeded_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.succeededActions',
      {
        defaultMessage: 'Succeeded actions',
      }
    ),
    isSortable: getIsColumnSortable('num_succeeded_actions'),
  },
  {
    id: 'num_errored_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.erroredActions',
      {
        defaultMessage: 'Errored actions',
      }
    ),
    isSortable: getIsColumnSortable('num_errored_actions'),
  },
  {
    id: 'total_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.totalSearchDuration',
      {
        defaultMessage: 'Total search duration',
      }
    ),
    isSortable: getIsColumnSortable('total_search_duration'),
  },
  {
    id: 'es_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.esSearchDuration',
      {
        defaultMessage: 'ES search duration',
      }
    ),
    isSortable: getIsColumnSortable('es_search_duration'),
  },
  {
    id: 'schedule_delay',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduleDelay',
      {
        defaultMessage: 'Schedule delay',
      }
    ),
    isSortable: getIsColumnSortable('schedule_delay'),
  },
  {
    id: 'timed_out',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timedOut',
      {
        defaultMessage: 'Timed out',
      }
    ),
    isSortable: getIsColumnSortable('timed_out'),
  },
];

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.apiError',
  {
    defaultMessage: 'Failed to fetch execution history',
  }
);

const RULE_EVENT_LOG_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleEventLogList.initialColumns';

const PAGE_SIZE_OPTION = [10, 50, 100];

const updateButtonProps = {
  iconOnly: true,
  fill: false,
};

export type RuleEventLogListProps = {
  rule: Rule;
  localStorageKey?: string;
  refreshToken?: number;
  requestRefresh?: () => Promise<void>;
} & Pick<RuleApis, 'loadExecutionLogAggregations'>;

export const RuleEventLogList = (props: RuleEventLogListProps) => {
  const {
    rule,
    localStorageKey = RULE_EVENT_LOG_LIST_STORAGE_KEY,
    loadExecutionLogAggregations,
    refreshToken,
  } = props;

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

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const { pageIndex, pageSize } = pagination;
    const pagedRowIndex = rowIndex - pageIndex * pageSize;

    const value = logs?.[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;
    return (
      <RuleEventLogListCellRenderer
        columnId={columnId as ColumnId}
        value={value}
        dateFormat={dateFormat}
      />
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
    <div>
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
      {isLoading && (
        <EuiProgress size="xs" color="accent" data-test-subj="ruleEventLogListProgressBar" />
      )}
      <EuiDataGrid
        aria-label="rule event log"
        data-test-subj="ruleEventLogList"
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

// eslint-disable-next-line import/no-default-export
export { RuleEventLogListWithApi as default };
