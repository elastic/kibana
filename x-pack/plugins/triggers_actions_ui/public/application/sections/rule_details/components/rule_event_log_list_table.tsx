/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiSwitch,
  EuiDataGridColumn,
} from '@elastic/eui';
import { IExecutionLog } from '@kbn/alerting-plugin/common';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import {
  RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  LOCKED_COLUMNS,
} from '../../../constants';
import {
  EventLogDataGrid,
  getIsColumnSortable,
  ColumnHeaderWithToolTip,
  numTriggeredActionsDisplay,
  numGeneratedActionsDisplay,
  numSucceededActionsDisplay,
  numErroredActionsDisplay,
  EventLogListStatusFilter,
} from '../../common/components/event_log';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { RuleActionErrorLogFlyout } from './rule_action_error_log_flyout';
import { RefineSearchPrompt } from '../../common/components/refine_search_prompt';
import { RulesListDocLink } from '../../rules_list/components/rules_list_doc_link';
import { LoadExecutionLogAggregationsProps } from '../../../lib/rule_api';
import { RuleEventLogListKPIWithApi as RuleEventLogListKPI } from './rule_event_log_list_kpi';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { useMultipleSpaces } from '../../../hooks/use_multiple_spaces';
import { RulesSettingsLink } from '../../../components/rules_setting/rules_settings_link';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

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

const ALL_SPACES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.ruleEventLogList.showAllSpacesToggle',
  {
    defaultMessage: 'Show rules from all spaces',
  }
);

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
  hasAllSpaceSwitch?: boolean;
  setHeaderActions?: (components?: React.ReactNode[]) => void;
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
    hasAllSpaceSwitch = false,
    setHeaderActions,
  } = props;

  const { uiSettings, notifications } = useKibana().services;

  const [searchText, setSearchText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedRunLog, setSelectedRunLog] = useState<IExecutionLog | undefined>();
  const [internalRefreshToken, setInternalRefreshToken] = useState<number | undefined>(
    refreshToken
  );
  const [showFromAllSpaces, setShowFromAllSpaces] = useState(false);

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

  const { onShowAllSpacesChange, canAccessMultipleSpaces, namespaces, activeSpace } =
    useMultipleSpaces({
      setShowFromAllSpaces,
      showFromAllSpaces,
      visibleColumns,
      setVisibleColumns,
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

  useEffect(() => {
    setHeaderActions?.([<RulesSettingsLink />, <RulesListDocLink />]);
    return () => setHeaderActions?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        namespaces,
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

  const getPaginatedRowIndex = useCallback(
    (rowIndex: number) => {
      const { pageIndex, pageSize } = pagination;
      return rowIndex - pageIndex * pageSize;
    },
    [pagination]
  );

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

  const columns: EuiDataGridColumn[] = useMemo(
    () => [
      ...(hasRuleNames
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
      ...(showFromAllSpaces
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
            const eventLog = logs || [];
            const runLog = eventLog[pagedRowIndex];
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
    [getPaginatedRowIndex, onFlyoutOpen, onFilterChange, hasRuleNames, showFromAllSpaces, logs]
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
        <EventLogDataGrid
          columns={columns}
          logs={logs}
          pagination={pagination}
          sortingColumns={sortingColumns}
          visibleColumns={visibleColumns}
          dateFormat={dateFormat}
          selectedRunLog={selectedRunLog}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onChangePage={onChangePage}
          onFlyoutOpen={onFlyoutOpen}
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
    showFromAllSpaces,
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
        <EuiFlexGroup alignItems="center">
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
            <EventLogListStatusFilter selectedOptions={filter} onChange={onFilterChange} />
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
          {hasAllSpaceSwitch && canAccessMultipleSpaces && (
            <EuiFlexItem data-test-subj="showAllSpacesSwitch">
              <EuiSwitch
                label={ALL_SPACES_LABEL}
                checked={showFromAllSpaces}
                onChange={onShowAllSpacesChange}
              />
            </EuiFlexItem>
          )}
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
          namespaces={namespaces}
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
          activeSpaceId={activeSpace?.id}
        />
      )}
    </EuiFlexGroup>
  );
};

const RuleEventLogListTableWithSpaces: React.FC<RuleEventLogListTableProps> = (props) => {
  const { spaces } = useKibana().services;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SpacesContextWrapper = useCallback(
    spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spaces]
  );
  return (
    <SpacesContextWrapper feature="triggersActions">
      <RuleEventLogListTable {...props} />
    </SpacesContextWrapper>
  );
};

export const RuleEventLogListTableWithApi = withBulkRuleOperations(RuleEventLogListTableWithSpaces);

// eslint-disable-next-line import/no-default-export
export { RuleEventLogListTableWithApi as default };
