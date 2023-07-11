/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiBadge,
  EuiDataGridCellPopoverElementProps,
  useEuiTheme,
  EuiToolTip,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import {
  IExecutionLog,
  executionLogSortableColumns,
  ExecutionLogSortFields,
} from '@kbn/alerting-plugin/common';
import { IExecutionLog as IConnectorsExecutionLog } from '@kbn/actions-plugin/common';
import { get } from 'lodash';
import { getIsExperimentalFeatureEnabled } from '../../../../../common/get_experimental_features';
import { EventLogListCellRenderer, ColumnId, EventLogPaginationStatus } from '.';
import { RuleActionErrorBadge } from '../../../rule_details/components/rule_action_error_badge';
import './event_log_list.scss';

export const getIsColumnSortable = (columnId: string) => {
  return executionLogSortableColumns.includes(columnId as ExecutionLogSortFields);
};

const getErroredActionsTranslation = (errors: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.eventLogDataGrid.erroredActionsTooltip', {
    defaultMessage: '{value, plural, one {# errored action} other {# errored actions}}',
    values: { value: errors },
  });
};

const PAGE_SIZE_OPTIONS = [10, 50, 100];

type ExecutionLog = IExecutionLog | IConnectorsExecutionLog;

export interface EventLogDataGrid {
  columns: EuiDataGridColumn[];
  logs: ExecutionLog[];
  pagination: Pagination;
  sortingColumns: EuiDataGridSorting['columns'];
  visibleColumns: string[];
  dateFormat: string;
  pageSizeOptions?: number[];
  selectedRunLog?: ExecutionLog;
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
  onFlyoutOpen?: (runLog: IExecutionLog) => void;
  setVisibleColumns: (visibleColumns: string[]) => void;
  setSortingColumns: (sortingColumns: EuiDataGridSorting['columns']) => void;
}

export const numTriggeredActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.triggeredActions',
  {
    defaultMessage: 'Triggered actions',
  }
);
const numTriggeredActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.triggeredActionsToolTip',
  {
    defaultMessage: 'The subset of generated actions that will run.',
  }
);

export const numGeneratedActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.scheduledActions',
  {
    defaultMessage: 'Generated actions',
  }
);
const numGeneratedActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.scheduledActionsToolTip',
  {
    defaultMessage: 'The total number of actions generated when the rule ran.',
  }
);

export const numSucceededActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.succeededActions',
  {
    defaultMessage: 'Succeeded actions',
  }
);
const numSucceededActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.succeededActionsToolTip',
  {
    defaultMessage: 'The number of actions that were completed successfully.',
  }
);

export const numErroredActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.erroredActions',
  {
    defaultMessage: 'Errored actions',
  }
);
const numErroredActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.eventLogColumn.erroredActionsToolTip',
  {
    defaultMessage: 'The number of failed actions.',
  }
);

const columnsWithToolTipMap: Record<string, Record<string, string>> = {
  num_triggered_actions: {
    display: numTriggeredActionsDisplay,
    toolTip: numTriggeredActionsToolTip,
  },
  num_generated_actions: {
    display: numGeneratedActionsDisplay,
    toolTip: numGeneratedActionsToolTip,
  },
  num_succeeded_actions: {
    display: numSucceededActionsDisplay,
    toolTip: numSucceededActionsToolTip,
  },
  num_errored_actions: {
    display: numErroredActionsDisplay,
    toolTip: numErroredActionsToolTip,
  },
};

export const ColumnHeaderWithToolTip = ({ id }: { id: string }) => {
  return (
    <EuiToolTip content={columnsWithToolTipMap[id].toolTip}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem>{columnsWithToolTipMap[id].display}</EuiFlexItem>
        <EuiFlexItem>
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

export const EventLogDataGrid = (props: EventLogDataGrid) => {
  const {
    columns,
    logs = [],
    sortingColumns,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    pagination,
    dateFormat,
    visibleColumns,
    selectedRunLog,
    setVisibleColumns,
    setSortingColumns,
    onChangeItemsPerPage,
    onChangePage,
    onFlyoutOpen,
  } = props;

  const { euiTheme } = useEuiTheme();

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const getPaginatedRowIndex = useCallback(
    (rowIndex: number) => {
      const { pageIndex, pageSize } = pagination;
      return rowIndex - pageIndex * pageSize;
    },
    [pagination]
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

  const rowClasses = useMemo(() => {
    if (!selectedRunLog) {
      return {};
    }
    const index = logs.findIndex((log) => log.id === selectedRunLog.id);
    return {
      [index]: 'ruleEventLogDataGrid--rowClassSelected',
    };
  }, [selectedRunLog, logs]);

  const gridStyles: EuiDataGridStyle = useMemo(() => {
    return {
      border: 'horizontal',
      header: 'underline',
      rowClasses,
    };
  }, [rowClasses]);

  const renderMessageWithActionError = (
    columnId: string,
    errors: number,
    showTooltip: boolean = false
  ) => {
    if (columnId !== 'message') {
      return null;
    }
    if (!errors) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        {showTooltip ? (
          <EuiToolTip content={getErroredActionsTranslation(errors)}>
            <RuleActionErrorBadge totalErrors={errors} showIcon />
          </EuiToolTip>
        ) : (
          <RuleActionErrorBadge totalErrors={errors} showIcon />
        )}
      </EuiFlexItem>
    );
  };

  // Renders the cell popover for runs with errored actions
  const renderCellPopover = (cellPopoverProps: EuiDataGridCellPopoverElementProps) => {
    const { columnId, rowIndex, cellActions, DefaultCellPopover } = cellPopoverProps;

    if (columnId !== 'message') {
      return <DefaultCellPopover {...cellPopoverProps} />;
    }

    const pagedRowIndex = getPaginatedRowIndex(rowIndex);
    const runLog = logs[pagedRowIndex];

    if (!runLog) {
      return null;
    }

    const value = runLog[columnId as keyof ExecutionLog] as string;
    const actionErrors = get(runLog, 'num_errored_actions', 0 as number);

    return (
      <div style={{ width: '100%' }}>
        <EuiSpacer size="s" />
        <div>
          <EuiText size="m">{value}</EuiText>
        </div>
        <EuiSpacer size="s" />
        {actionErrors > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                {renderMessageWithActionError(columnId, actionErrors)}
              </EuiFlexItem>
              <EuiFlexItem>
                &nbsp;
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.eventLogDataGrid.erroredActionsCellPopover"
                  defaultMessage="{value, plural, one {errored action} other {errored actions}}"
                  values={{
                    value: actionErrors,
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {cellActions}
          </>
        )}
      </div>
    );
  };

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    const pagedRowIndex = getPaginatedRowIndex(rowIndex);

    const runLog = logs[pagedRowIndex];
    const value = logs[pagedRowIndex]?.[columnId as keyof ExecutionLog] as string;
    const actionErrors = get(logs[pagedRowIndex], 'num_errored_actions', 0 as number);
    const version = logs?.[pagedRowIndex]?.version;
    const ruleId = get(runLog, 'rule_id');
    const spaceIds = runLog?.space_ids;

    if (columnId === 'num_errored_actions' && runLog && onFlyoutOpen) {
      return (
        <EuiBadge
          data-test-subj="eventLogDataGridErroredActionBadge"
          style={{
            cursor: 'pointer',
            borderRadius: euiTheme.border.radius.medium,
          }}
          color="hollow"
          onClick={() => onFlyoutOpen(runLog as IExecutionLog)}
          onClickAriaLabel={i18n.translate(
            'xpack.triggersActionsUI.sections.eventLogColumn.openActionErrorsFlyout',
            {
              defaultMessage: 'Open action errors flyout',
            }
          )}
        >
          {value}
        </EuiBadge>
      );
    }
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        {renderMessageWithActionError(columnId, actionErrors, true)}
        <EuiFlexItem>
          <EventLogListCellRenderer
            columnId={columnId as ColumnId}
            value={value}
            version={version}
            dateFormat={dateFormat}
            ruleId={ruleId}
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
        aria-label="event log"
        data-test-subj="eventLogList"
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
