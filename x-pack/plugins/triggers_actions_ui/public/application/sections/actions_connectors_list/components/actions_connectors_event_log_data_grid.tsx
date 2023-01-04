/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiDataGridStyle,
  Pagination,
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
  EuiDataGridColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiDataGridCellPopoverElementProps,
  EuiText,
} from '@elastic/eui';
import { executionLogSortableColumns, ExecutionLogSortFields } from '@kbn/alerting-plugin/common';
import { IExecutionLog } from '@kbn/actions-plugin/common';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import '../../common/components/event_log/event_log_list.scss';
import {
  ColumnId,
  EventLogListCellRenderer,
  EventLogPaginationStatus,
} from '../../common/components/event_log';

const getIsColumnSortable = (columnId: string) => {
  return executionLogSortableColumns.includes(columnId as ExecutionLogSortFields);
};

const PAGE_SIZE_OPTIONS = [10, 50, 100];

export interface ConnectorEventLogDataGrid {
  logs: IExecutionLog[];
  pagination: Pagination;
  sortingColumns: EuiDataGridSorting['columns'];
  visibleColumns: string[];
  dateFormat: string;
  pageSizeOptions?: number[];
  showRuleNameAndIdColumns?: boolean;
  showSpaceColumns?: boolean;
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
  onFilterChange: (filter: string[]) => void;
  setVisibleColumns: (visibleColumns: string[]) => void;
  setSortingColumns: (sortingColumns: EuiDataGridSorting['columns']) => void;
}

export const ConnectorEventLogDataGrid = (props: ConnectorEventLogDataGrid) => {
  const {
    logs = [],
    sortingColumns,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    pagination,
    dateFormat,
    visibleColumns,
    showRuleNameAndIdColumns = false,
    showSpaceColumns = false,
    setVisibleColumns,
    setSortingColumns,
    onChangeItemsPerPage,
    onChangePage,
    onFilterChange,
  } = props;

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const getPaginatedRowIndex = useCallback(
    (rowIndex: number) => {
      const { pageIndex, pageSize } = pagination;
      return rowIndex - pageIndex * pageSize;
    },
    [pagination]
  );

  const columns: EuiDataGridColumn[] = useMemo(
    () => [
      ...(showRuleNameAndIdColumns
        ? [
            {
              id: 'connector_id',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.connectorId',
                {
                  defaultMessage: 'Connector Id',
                }
              ),
              isSortable: getIsColumnSortable('connector_id'),
              actions: {
                showSortAsc: false,
                showSortDesc: false,
              },
            },
            {
              id: 'connector_name',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.connectorName',
                {
                  defaultMessage: 'Connector',
                }
              ),
              isSortable: getIsColumnSortable('connector_name'),
              actions: {
                showSortAsc: false,
                showSortDesc: false,
                showHide: false,
              },
            },
          ]
        : []),
      ...(showSpaceColumns
        ? [
            {
              id: 'space_ids',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.spaceIds',
                {
                  defaultMessage: 'Space',
                }
              ),
              isSortable: getIsColumnSortable('space_ids'),
              actions: {
                showSortAsc: false,
                showSortDesc: false,
                showHide: false,
              },
            },
          ]
        : []),
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
        isResizable: false,
        actions: {
          showHide: false,
        },
        initialWidth: 250,
      },
      {
        id: 'status',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.response',
          {
            defaultMessage: 'Response',
          }
        ),
        actions: {
          showHide: false,
          showSortAsc: false,
          showSortDesc: false,
          additional: [
            {
              iconType: 'annotation',
              label: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.showOnlyFailures',
                {
                  defaultMessage: 'Show only failures',
                }
              ),
              onClick: () => onFilterChange(['failure']),
              size: 'xs',
            },
            {
              iconType: 'annotation',
              label: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.showAll',
                {
                  defaultMessage: 'Show all',
                }
              ),
              onClick: () => onFilterChange([]),
              size: 'xs',
            },
          ],
        },
        isSortable: getIsColumnSortable('status'),
        isResizable: false,
        initialWidth: 150,
      },
      {
        id: 'message',
        actions: {
          showSortAsc: false,
          showSortDesc: false,
        },
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.message',
          {
            defaultMessage: 'Message',
          }
        ),
        isSortable: getIsColumnSortable('message'),
        cellActions: [],
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
    ],
    [onFilterChange, showRuleNameAndIdColumns, showSpaceColumns]
  );

  const columnVisibilityProps = useMemo(() => {
    return {
      visibleColumns,
      setVisibleColumns,
    };
  }, [visibleColumns, setVisibleColumns]);

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

  const gridStyles: EuiDataGridStyle = useMemo(() => {
    return {
      border: 'horizontal',
      header: 'underline',
      rowClasses: {},
    };
  }, []);

  // Renders the cell popover for runs with errored actions
  const renderCellPopover = (cellPopoverProps: EuiDataGridCellPopoverElementProps) => {
    const { columnId, rowIndex, DefaultCellPopover } = cellPopoverProps;

    if (columnId !== 'message') {
      return <DefaultCellPopover {...cellPopoverProps} />;
    }

    const pagedRowIndex = getPaginatedRowIndex(rowIndex);
    const runLog = logs[pagedRowIndex];

    if (!runLog) {
      return null;
    }

    const value = runLog[columnId as keyof IExecutionLog] as string;
    return (
      <div style={{ width: '100%' }}>
        <EuiSpacer size="s" />
        <div>
          <EuiText size="m">{value}</EuiText>
        </div>
        <EuiSpacer size="s" />
      </div>
    );
  };

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const pagedRowIndex = getPaginatedRowIndex(rowIndex);

    const runLog = logs[pagedRowIndex];
    const value = logs[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;
    const version = logs?.[pagedRowIndex]?.version;
    const spaceIds = runLog?.space_ids;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EventLogListCellRenderer
            columnId={columnId as ColumnId}
            value={value}
            version={version}
            dateFormat={dateFormat}
            spaceIds={spaceIds}
            useExecutionStatus={isRuleUsingExecutionStatus}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <EventLogPaginationStatus
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
        renderCellPopover={renderCellPopover}
      />
    </>
  );
};
