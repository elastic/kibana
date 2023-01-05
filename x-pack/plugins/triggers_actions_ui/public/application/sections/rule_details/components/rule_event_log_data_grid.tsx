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
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { RuleEventLogListCellRenderer, ColumnId } from './rule_event_log_list_cell_renderer';
import { RuleEventLogPaginationStatus } from './rule_event_log_pagination_status';
import { RuleActionErrorBadge } from './rule_action_error_badge';
import './rule_event_log_list.scss';

const getIsColumnSortable = (columnId: string) => {
  return executionLogSortableColumns.includes(columnId as ExecutionLogSortFields);
};

const getErroredActionsTranslation = (errors: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogDataGrid.erroredActionsTooltip',
    {
      defaultMessage: '{value, plural, one {# errored action} other {# errored actions}}',
      values: { value: errors },
    }
  );
};

const PAGE_SIZE_OPTIONS = [10, 50, 100];

export interface RuleEventLogDataGrid {
  logs: IExecutionLog[];
  pagination: Pagination;
  sortingColumns: EuiDataGridSorting['columns'];
  visibleColumns: string[];
  dateFormat: string;
  pageSizeOptions?: number[];
  selectedRunLog?: IExecutionLog;
  showRuleNameAndIdColumns?: boolean;
  showSpaceColumns?: boolean;
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
  onFilterChange: (filter: string[]) => void;
  onFlyoutOpen: (runLog: IExecutionLog) => void;
  setVisibleColumns: (visibleColumns: string[]) => void;
  setSortingColumns: (sortingColumns: EuiDataGridSorting['columns']) => void;
}

const numTriggeredActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.triggeredActions',
  {
    defaultMessage: 'Triggered actions',
  }
);
const numTriggeredActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.triggeredActionsToolTip',
  {
    defaultMessage: 'The subset of generated actions that will run.',
  }
);

const numGeneratedActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduledActions',
  {
    defaultMessage: 'Generated actions',
  }
);
const numGeneratedActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduledActionsToolTip',
  {
    defaultMessage: 'The total number of actions generated when the rule ran.',
  }
);

const numSucceededActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.succeededActions',
  {
    defaultMessage: 'Succeeded actions',
  }
);
const numSucceededActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.succeededActionsToolTip',
  {
    defaultMessage: 'The number of actions that were completed successfully.',
  }
);

const numErroredActionsDisplay = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.erroredActions',
  {
    defaultMessage: 'Errored actions',
  }
);
const numErroredActionsToolTip = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.erroredActionsToolTip',
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

const ColumnHeaderWithToolTip = ({ id }: { id: string }) => {
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

export const RuleEventLogDataGrid = (props: RuleEventLogDataGrid) => {
  const {
    logs = [],
    sortingColumns,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    pagination,
    dateFormat,
    visibleColumns,
    selectedRunLog,
    showRuleNameAndIdColumns = false,
    showSpaceColumns = false,
    setVisibleColumns,
    setSortingColumns,
    onChangeItemsPerPage,
    onChangePage,
    onFilterChange,
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

  const columns: EuiDataGridColumn[] = useMemo(
    () => [
      ...(showRuleNameAndIdColumns
        ? [
            {
              id: 'rule_id',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.ruleId',
                {
                  defaultMessage: 'Rule Id',
                }
              ),
              isSortable: getIsColumnSortable('rule_id'),
              actions: {
                showSortAsc: false,
                showSortDesc: false,
              },
            },
            {
              id: 'rule_name',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.ruleName',
                {
                  defaultMessage: 'Rule',
                }
              ),
              isSortable: getIsColumnSortable('rule_name'),
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
        id: 'execution_duration',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.duration',
          {
            defaultMessage: 'Duration',
          }
        ),
        isSortable: getIsColumnSortable('execution_duration'),
        isResizable: false,
        actions: {
          showHide: false,
        },
        initialWidth: 100,
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
        cellActions: [
          ({ rowIndex, Component }) => {
            const pagedRowIndex = getPaginatedRowIndex(rowIndex);
            const runLog = logs[pagedRowIndex];
            const actionErrors = runLog?.num_errored_actions as number;
            if (actionErrors) {
              return (
                <Component onClick={() => onFlyoutOpen(runLog)} iconType="alert">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.viewActionErrors"
                    defaultMessage="View action errors"
                  />
                </Component>
              );
            }
            return null;
          },
        ],
      },
      {
        id: 'num_active_alerts',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.activeAlerts',
          {
            defaultMessage: 'Active alerts',
          }
        ),
        initialWidth: 140,
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
        initialWidth: 140,
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
        displayAsText: numTriggeredActionsDisplay,
        display: <ColumnHeaderWithToolTip id="num_triggered_actions" />,
        isSortable: getIsColumnSortable('num_triggered_actions'),
      },
      {
        id: 'num_generated_actions',
        displayAsText: numGeneratedActionsDisplay,
        display: <ColumnHeaderWithToolTip id="num_generated_actions" />,
        isSortable: getIsColumnSortable('num_generated_actions'),
      },
      {
        id: 'num_succeeded_actions',
        displayAsText: numSucceededActionsDisplay,
        display: <ColumnHeaderWithToolTip id="num_succeeded_actions" />,
        isSortable: getIsColumnSortable('num_succeeded_actions'),
      },
      {
        id: 'num_errored_actions',
        actions: {
          showSortAsc: false,
          showSortDesc: false,
        },
        displayAsText: numErroredActionsDisplay,
        display: <ColumnHeaderWithToolTip id="num_errored_actions" />,
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
    ],
    [
      getPaginatedRowIndex,
      onFlyoutOpen,
      onFilterChange,
      showRuleNameAndIdColumns,
      showSpaceColumns,
      logs,
    ]
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

    const value = runLog[columnId as keyof IExecutionLog] as string;
    const actionErrors = runLog.num_errored_actions || (0 as number);

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
                  id="xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogDataGrid.erroredActionsCellPopover"
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
    const value = logs[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;
    const actionErrors = logs[pagedRowIndex]?.num_errored_actions || (0 as number);
    const version = logs?.[pagedRowIndex]?.version;
    const ruleId = runLog?.rule_id;
    const spaceIds = runLog?.space_ids;

    if (columnId === 'num_errored_actions' && runLog) {
      return (
        <EuiBadge
          data-test-subj="ruleEventLogDataGridErroredActionBadge"
          style={{
            cursor: 'pointer',
            borderRadius: euiTheme.border.radius.medium,
          }}
          color="hollow"
          onClick={() => onFlyoutOpen(runLog)}
          onClickAriaLabel={i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.openActionErrorsFlyout',
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
          <RuleEventLogListCellRenderer
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
        renderCellPopover={renderCellPopover}
      />
    </>
  );
};
