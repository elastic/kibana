/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiDataGridStyle,
  Pagination,
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
} from '@elastic/eui';
import {
  IExecutionLog,
  executionLogSortableColumns,
  ExecutionLogSortFields,
} from '@kbn/alerting-plugin/common';
import { RuleEventLogListCellRenderer, ColumnId } from './rule_event_log_list_cell_renderer';
import { RuleEventLogPaginationStatus } from './rule_event_log_pagination_status';

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
    id: 'num_generated_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduledActions',
      {
        defaultMessage: 'Generated actions',
      }
    ),
    isSortable: getIsColumnSortable('num_generated_actions'),
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

const PAGE_SIZE_OPTIONS = [10, 50, 100];

const gridStyles: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'underline',
};

export interface RuleEventLogDataGrid {
  logs: IExecutionLog[];
  pagination: Pagination;
  sortingColumns: EuiDataGridSorting['columns'];
  visibleColumns: string[];
  dateFormat: string;
  pageSizeOptions?: number[];
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
  setVisibleColumns: (visibleColumns: string[]) => void;
  setSortingColumns: (sortingColumns: EuiDataGridSorting['columns']) => void;
}

export const RuleEventLogDataGrid = (props: RuleEventLogDataGrid) => {
  const {
    logs = [],
    sortingColumns,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    pagination,
    dateFormat,
    visibleColumns,
    setVisibleColumns,
    setSortingColumns,
    onChangeItemsPerPage,
    onChangePage,
  } = props;

  const columnVisibilityProps = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns,
    }),
    [visibleColumns, setVisibleColumns]
  );

  const sortingProps = useMemo(
    () => ({
      onSort: setSortingColumns,
      columns: sortingColumns,
    }),
    [setSortingColumns, sortingColumns]
  );

  const paginationProps = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions,
      onChangeItemsPerPage,
      onChangePage,
    }),
    [pagination, pageSizeOptions, onChangeItemsPerPage, onChangePage]
  );

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const { pageIndex, pageSize } = pagination;
    const pagedRowIndex = rowIndex - pageIndex * pageSize;

    const value = logs[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;
    const version = logs?.[pagedRowIndex]?.version;
    return (
      <RuleEventLogListCellRenderer
        columnId={columnId as ColumnId}
        value={value}
        version={version}
        dateFormat={dateFormat}
      />
    );
  };

  return (
    <>
      <RuleEventLogPaginationStatus
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        totalItemCount={pagination.totalItemCount}
      />
      <EuiDataGrid
        aria-label="rule event log"
        data-test-subj="ruleEventLogList"
        columns={columns}
        rowCount={pagination.totalItemCount}
        renderCellValue={renderCell}
        columnVisibility={columnVisibilityProps}
        sorting={sortingProps}
        pagination={paginationProps}
        gridStyle={gridStyles}
      />
    </>
  );
};
