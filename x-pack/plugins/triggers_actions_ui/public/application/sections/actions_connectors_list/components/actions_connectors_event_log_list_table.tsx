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
  EuiSwitch,
  EuiDataGridColumn,
} from '@elastic/eui';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { IExecutionLog } from '@kbn/actions-plugin/common';
import { useKibana, useSpacesData } from '../../../../common/lib/kibana';
import {
  GLOBAL_CONNECTOR_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  CONNECTOR_LOCKED_COLUMNS,
} from '../../../constants';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { LoadGlobalConnectorExecutionLogAggregationsProps } from '../../../lib/action_connector_api';
import {
  ComponentOpts as ConnectorApis,
  withActionOperations,
} from '../../common/components/with_actions_api_operations';
import { RefineSearchPrompt } from '../../common/components/refine_search_prompt';
import { ConnectorEventLogListKPIWithApi as ConnectorEventLogListKPI } from './actions_connectors_event_log_list_kpi';
import {
  EventLogDataGrid,
  EventLogListStatusFilter,
  getIsColumnSortable,
} from '../../common/components/event_log';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.apiError',
  {
    defaultMessage: 'Failed to fetch execution history',
  }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.searchPlaceholder',
  {
    defaultMessage: 'Search event log message',
  }
);

const CONNECTOR_EVENT_LOG_LIST_STORAGE_KEY =
  'xpack.triggersActionsUI.connectorEventLogList.initialColumns';

const getDefaultColumns = (columns: string[]) => {
  const columnsWithoutLockedColumn = columns.filter(
    (column) => !CONNECTOR_LOCKED_COLUMNS.includes(column)
  );
  return [...CONNECTOR_LOCKED_COLUMNS, ...columnsWithoutLockedColumn];
};

const ALL_SPACES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.connectorEventLogList.showAllSpacesToggle',
  {
    defaultMessage: 'Show connectors from all spaces',
  }
);

const updateButtonProps = {
  iconOnly: true,
  fill: false,
};

const MAX_RESULTS = 1000;

export type ConnectorEventLogListOptions = 'stackManagement' | 'default';

export type ConnectorEventLogListCommonProps = {
  localStorageKey?: string;
  refreshToken?: number;
  initialPageSize?: number;
  hasConnectorNames?: boolean;
  hasAllSpaceSwitch?: boolean;
} & Pick<ConnectorApis, 'loadGlobalConnectorExecutionLogAggregations'>;

export type ConnectorEventLogListTableProps<T extends ConnectorEventLogListOptions = 'default'> =
  T extends 'default'
    ? ConnectorEventLogListCommonProps
    : T extends 'stackManagement'
    ? ConnectorEventLogListCommonProps
    : never;

export const ConnectorEventLogListTable = <T extends ConnectorEventLogListOptions>(
  props: ConnectorEventLogListTableProps<T>
) => {
  const {
    localStorageKey = CONNECTOR_EVENT_LOG_LIST_STORAGE_KEY,
    refreshToken,
    loadGlobalConnectorExecutionLogAggregations,
    initialPageSize = 10,
    hasConnectorNames = false,
    hasAllSpaceSwitch = false,
  } = props;

  const { uiSettings, notifications } = useKibana().services;

  const [searchText, setSearchText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [internalRefreshToken, setInternalRefreshToken] = useState<number | undefined>(
    refreshToken
  );
  const [showFromAllSpaces, setShowFromAllSpaces] = useState(false);

  // Data grid states
  const [logs, setLogs] = useState<IExecutionLog[]>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return getDefaultColumns(GLOBAL_CONNECTOR_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS);
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

  const spacesData = useSpacesData();
  const accessibleSpaceIds = useMemo(
    () => (spacesData ? [...spacesData.spacesMap.values()].map((e) => e.id) : []),
    [spacesData]
  );
  const areMultipleSpacesAccessible = useMemo(
    () => accessibleSpaceIds.length > 1,
    [accessibleSpaceIds]
  );
  const namespaces = useMemo(
    () => (showFromAllSpaces && spacesData ? accessibleSpaceIds : undefined),
    [showFromAllSpaces, spacesData, accessibleSpaceIds]
  );

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

  const loadEventLogs = async () => {
    if (!loadGlobalConnectorExecutionLogAggregations) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadGlobalConnectorExecutionLogAggregations({
        sort: formattedSort as LoadGlobalConnectorExecutionLogAggregationsProps['sort'],
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

  const onShowAllSpacesChange = useCallback(() => {
    setShowFromAllSpaces((prev) => !prev);
    const nextShowFromAllSpaces = !showFromAllSpaces;

    if (nextShowFromAllSpaces && !visibleColumns.includes('space_ids')) {
      const connectorNameIndex = visibleColumns.findIndex((c) => c === 'connector_name');
      const newVisibleColumns = [...visibleColumns];
      newVisibleColumns.splice(connectorNameIndex + 1, 0, 'space_ids');
      setVisibleColumns(newVisibleColumns);
    } else if (!nextShowFromAllSpaces && visibleColumns.includes('space_ids')) {
      setVisibleColumns(visibleColumns.filter((c) => c !== 'space_ids'));
    }
  }, [setShowFromAllSpaces, showFromAllSpaces, visibleColumns]);

  const columns: EuiDataGridColumn[] = useMemo(
    () => [
      {
        id: 'id',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.id',
          {
            defaultMessage: 'Execution Id',
          }
        ),
        isSortable: getIsColumnSortable('id'),
      },
      {
        id: 'timestamp',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.timestamp',
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
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.response',
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
                'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.showOnlyFailures',
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
                'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.showAll',
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
      ...(hasConnectorNames
        ? [
            {
              id: 'connector_name',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.connectorName',
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
      {
        id: 'message',
        actions: {
          showSortAsc: false,
          showSortDesc: false,
        },
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.message',
          {
            defaultMessage: 'Message',
          }
        ),
        isSortable: getIsColumnSortable('message'),
        cellActions: [],
      },
      {
        id: 'execution_duration',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.duration',
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
        id: 'schedule_delay',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.scheduleDelay',
          {
            defaultMessage: 'Schedule delay',
          }
        ),
        isSortable: getIsColumnSortable('schedule_delay'),
      },
      {
        id: 'timed_out',
        displayAsText: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.timedOut',
          {
            defaultMessage: 'Timed out',
          }
        ),
        isSortable: getIsColumnSortable('timed_out'),
      },
      ...(showFromAllSpaces
        ? [
            {
              id: 'space_ids',
              displayAsText: i18n.translate(
                'xpack.triggersActionsUI.sections.connectorEventLogList.eventLogColumn.spaceIds',
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
    ],
    [onFilterChange, hasConnectorNames, showFromAllSpaces]
  );

  const renderList = () => {
    if (!logs) {
      return <CenterJustifiedSpinner />;
    }
    return (
      <>
        {isLoading && (
          <EuiProgress size="xs" color="accent" data-test-subj="connectorEventLogListProgressBar" />
        )}
        <EventLogDataGrid
          columns={columns}
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
              data-test-subj="connectorEventLogListDatePicker"
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
          {hasAllSpaceSwitch && areMultipleSpacesAccessible && (
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
        <ConnectorEventLogListKPI
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
            backToTopAnchor="logs"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ConnectorEventLogListTableWithSpaces: React.FC<ConnectorEventLogListTableProps> = (props) => {
  const { spaces } = useKibana().services;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SpacesContextWrapper = useCallback(
    spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spaces]
  );
  return (
    <SpacesContextWrapper feature="triggersActions">
      <ConnectorEventLogListTable {...props} />
    </SpacesContextWrapper>
  );
};

export const ConnectorEventLogListTableWithApi = withActionOperations(
  ConnectorEventLogListTableWithSpaces
);

// eslint-disable-next-line import/no-default-export
export { ConnectorEventLogListTableWithApi as default };
