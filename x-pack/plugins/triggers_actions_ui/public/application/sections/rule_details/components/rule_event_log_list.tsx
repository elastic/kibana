/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import datemath from '@elastic/datemath';
import {
  EuiDataGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiDataGridSorting,
  Pagination,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { RuleEventLogListStatusFilter, statusToIcon } from './rule_event_log_list_status_filter';
import { RuleDurationFormat } from '../../../sections/rules_list/components/rule_duration_format';

import { Rule } from '../../../../types';
import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
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

const columns = [
  {
    id: 'id',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.id',
      {
        defaultMessage: 'Id',
      }
    ),
  },
  {
    id: 'timestamp',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timestamp',
      {
        defaultMessage: 'Timestamp',
      }
    ),
    isSortable: true,
  },
  {
    id: 'execution_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.duration',
      {
        defaultMessage: 'Duration',
      }
    ),
  },
  {
    id: 'status',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.status',
      {
        defaultMessage: 'Status',
      }
    ),
  },
  {
    id: 'message',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.message',
      {
        defaultMessage: 'Message',
      }
    ),
  },
  {
    id: 'num_active_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.activeAlerts',
      {
        defaultMessage: 'Active alerts',
      }
    ),
  },
  {
    id: 'num_new_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.newAlerts',
      {
        defaultMessage: 'New alerts',
      }
    ),
  },
  {
    id: 'num_recovered_alerts',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.recoveredAlerts',
      {
        defaultMessage: 'Recovered alerts',
      }
    ),
  },
  {
    id: 'num_triggered_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.triggeredActions',
      {
        defaultMessage: 'Triggered actions',
      }
    ),
    sortable: true,
  },
  {
    id: 'num_succeeded_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.succeededActions',
      {
        defaultMessage: 'Succeeded actions',
      }
    ),
  },
  {
    id: 'num_errored_actions',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.erroredActions',
      {
        defaultMessage: 'Errored actions',
      }
    ),
  },
  {
    id: 'total_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.totalSearchDuration',
      {
        defaultMessage: 'Total search duration',
      }
    ),
    sortable: true,
  },
  {
    id: 'es_search_duration',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.esSearchDuration',
      {
        defaultMessage: 'ES search duration',
      }
    ),
    sortable: true,
  },
  {
    id: 'schedule_delay',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.scheduleDelay',
      {
        defaultMessage: 'Schedule delay',
      }
    ),
    sortable: true,
  },
  {
    id: 'timed_out',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.timedOut',
      {
        defaultMessage: 'Timed out',
      }
    ),
  },
];

const durationColumns = [
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
];

const initialVisibleColumns = ['timestamp', 'execution_duration', 'status', 'message'];

const statusFilters = ['success', 'failed'];

const pageSizeOptions = [10, 50, 100];

export type RuleEventLogListProps = {
  rule: Rule;
} & Pick<RuleApis, 'loadExecutionLogAggregations'>;

const RuleEventLogList = (props: RuleEventLogListProps) => {
  const { rule, loadExecutionLogAggregations } = props;

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [pagination, setPagination] = useState<Pagination>({
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 0,
  });

  // Date related states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dateStart, setDateStart] = useState<string>('now-24h');
  const [dateEnd, setDateEnd] = useState<string>('now');

  const [filter, setFilter] = useState<string[]>([]);

  // Main cell renderer, renders durations, statuses, etc.
  const renderCell = ({
    rowIndex,
    columnId,
  }: {
    rowIndex: number;
    columnId: string;
  }): React.ReactNode => {
    const pagedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;
    const value = logs?.[pagedRowIndex]?.[columnId as keyof IExecutionLog] as string;
    if (!value) {
      return null;
    }
    if (columnId === 'status') {
      return (
        <>
          {statusToIcon[value]} {value}
        </>
      );
    }
    if (columnId === 'timestamp') {
      return moment(value).format('MMM D, YYYY HH:mm:ssa');
    }
    if (durationColumns.includes(columnId)) {
      return <RuleDurationFormat duration={parseInt(value, 10)} />;
    }
    return value;
  };

  // Computed data grid props
  const sortingProps = useMemo(
    () => ({
      onSort: setSortingColumns,
      columns: sortingColumns,
    }),
    [sortingColumns]
  );

  const formattedSort = useMemo(() => {
    return sortingColumns.map(({ id: sortId, direction }) => ({
      [sortId]: {
        order: direction,
      },
    }));
  }, [sortingColumns]);

  const loadEventLogs = async () => {
    setIsLoading(true);
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
      pageSizeOptions,
      onChangeItemsPerPage,
      onChangePage,
    }),
    [pagination, onChangeItemsPerPage, onChangePage]
  );

  const onTimeChange = ({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }
    setDateStart(start);
    setDateEnd(end);
  };

  const onRefresh = () => {
    loadEventLogs();
  };

  useEffect(() => {
    loadEventLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingColumns, dateStart, dateEnd, filter, pagination.pageIndex, pagination.pageSize]);

  return (
    <div>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiSuperDatePicker
            isLoading={isLoading}
            start={dateStart}
            end={dateEnd}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <RuleEventLogListStatusFilter
            options={statusFilters}
            selectedOptions={filter}
            onChange={setFilter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiDataGrid
        aria-label="rule execution log"
        columns={columns}
        rowCount={pagination.totalItemCount}
        renderCellValue={renderCell}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        sorting={sortingProps}
        pagination={paginationProps}
      />
    </div>
  );
};

export const RuleEventLogListWithApi = withBulkRuleOperations(RuleEventLogList);
