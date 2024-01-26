/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dataTableActions,
  DataTableComponent,
  defaultHeaders,
  getEventIdToDataMapping,
} from '@kbn/securitysolution-data-table';
import type {
  SubsetDataTableModel,
  TableId,
  ViewSelection,
} from '@kbn/securitysolution-data-table';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useRef, useCallback, useMemo, useEffect, useState, useContext } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import { ThemeContext } from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type {
  DeprecatedCellValueElementProps,
  DeprecatedRowRenderer,
  Direction,
  EntityType,
} from '@kbn/timelines-plugin/common';
import { isEmpty } from 'lodash';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../../../../common/constants';
import type { Sort } from '../../../timelines/components/timeline/body/sort';
import type {
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../common/types';
import type { RowRenderer } from '../../../../common/types/timeline';
import { InputsModelId } from '../../store/inputs/constants';
import type { State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { eventsViewerSelector } from './selectors';
import type { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import type { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { useKibana } from '../../lib/kibana';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import type { FieldEditorActions } from '../../../timelines/components/fields_browser';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import {
  useSessionViewNavigation,
  useSessionView,
} from '../../../timelines/components/timeline/session_tab_content/use_session_view';
import {
  EventsContainerLoading,
  FullScreenContainer,
  FullWidthFlexGroupTable,
  ScrollableFlexItem,
  StyledEuiPanel,
} from './styles';
import { getDefaultViewSelection, getCombinedFilterQuery } from './helpers';
import { useTimelineEvents } from './use_timelines_events';
import { TableContext, EmptyTable, TableLoading } from './shared';
import type { AlertWorkflowStatus } from '../../types';
import { useQueryInspector } from '../page/manage_query';
import type { SetQuery } from '../../containers/use_global_time/types';
import { checkBoxControlColumn, transformControlColumns } from '../control_columns';
import { RightTopMenu } from './right_top_menu';
import { useAlertBulkActions } from './use_alert_bulk_actions';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { StatefulEventContext } from './stateful_event_context';
import { defaultUnit } from '../toolbar/unit';
import { useGetFieldSpec } from '../../hooks/use_get_field_spec';

const storage = new Storage(localStorage);

const SECURITY_ALERTS_CONSUMERS = [AlertConsumers.SIEM];

export interface EventsViewerProps {
  defaultModel: SubsetDataTableModel;
  end: string;
  entityType?: EntityType;
  tableId: TableId;
  leadingControlColumns: ControlColumnProps[];
  sourcererScope: SourcererScopeName;
  start: string;
  showTotalCount?: boolean; // eslint-disable-line react/no-unused-prop-types
  pageFilters?: Filter[];
  currentFilter?: AlertWorkflowStatus;
  onRuleChange?: () => void;
  renderCellValue: React.FC<CellValueElementProps>;
  rowRenderers: RowRenderer[];
  additionalFilters?: React.ReactNode;
  hasCrudPermissions?: boolean;
  unit?: (n: number) => string;
  indexNames?: string[];
  bulkActions: boolean | BulkActionsProp;
  additionalRightMenuOptions?: React.ReactNode[];
  cellActionsTriggerId?: string;
}

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<EventsViewerProps & PropsFromRedux> = ({
  additionalFilters,
  additionalRightMenuOptions,
  bulkActions,
  cellActionsTriggerId,
  clearSelected,
  currentFilter,
  defaultModel,
  end,
  entityType = 'events',
  hasCrudPermissions = true,
  indexNames,
  leadingControlColumns,
  onRuleChange,
  pageFilters,
  renderCellValue,
  rowRenderers,
  setSelected,
  sourcererScope,
  start,
  tableId,
  unit = defaultUnit,
}) => {
  const dispatch = useDispatch();
  const theme: EuiTheme = useContext(ThemeContext);
  const tableContext = useMemo(() => ({ tableId }), [tableId]);

  const {
    filters,
    query,
    dataTable: {
      columns,
      defaultColumns,
      deletedEventIds,
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      itemsPerPage,
      itemsPerPageOptions,
      sessionViewConfig,
      showCheckboxes,
      sort,
      queryFields,
      selectAll,
      selectedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      title,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));

  const {
    uiSettings,
    data,
    triggersActionsUi: { getFieldBrowser },
  } = useKibana().services;

  const [tableView, setTableView] = useState<ViewSelection>(
    getDefaultViewSelection({
      tableId,
      value: storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY),
    })
  );

  const {
    browserFields,
    dataViewId,
    indexPattern,
    runtimeMappings,
    selectedPatterns,
    dataViewId: selectedDataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(sourcererScope);

  const getFieldSpec = useGetFieldSpec(sourcererScope);

  const { globalFullScreen } = useGlobalFullScreen();

  const editorActionsRef = useRef<FieldEditorActions>(null);
  useEffect(() => {
    dispatch(
      dataTableActions.createDataTable({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: tableId,
        indexNames: indexNames ?? selectedPatterns,
        itemsPerPage,
        showCheckboxes,
        sort,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ id: tableId, inputId: InputsModelId.global }));
      if (editorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        editorActionsRef.current.closeEditor();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);

  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });

  const { DetailsPanel, SessionView } = useSessionView({
    entityType,
    scopeId: tableId,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);
  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      dispatch(
        inputsActions.setQuery({
          id,
          inputId: InputsModelId.global,
          inspect,
          loading,
          refetch,
        })
      ),
    [dispatch]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope,
    editorActionsRef,
    upsertColumn: useCallback(
      (column, index) => dispatch(dataTableActions.upsertColumn({ column, id: tableId, index })),
      [dispatch, tableId]
    ),
    removeColumn: useCallback(
      (columnId) => dispatch(dataTableActions.removeColumn({ columnId, id: tableId })),
      [dispatch, tableId]
    ),
  });

  const columnHeaders = isEmpty(columns) ? defaultHeaders : columns;
  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders: [],
        filters: globalFilters,
        from: start,
        indexPattern,
        kqlMode: 'filter',
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, browserFields, globalFilters, start, indexPattern, query, end]
  );

  const canQueryTimeline = useMemo(
    () =>
      filterQuery != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, filterQuery, start, end]
  );

  const fields = useMemo(
    () => [...columnHeaders.map((c: { id: string }) => c.id), ...(queryFields ?? [])],
    [columnHeaders, queryFields]
  );

  const sortField = useMemo(
    () =>
      (sort as Sort[]).map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );

  const [loading, { events, loadPage, pageInfo, refetch, totalCount = 0, inspect }] =
    useTimelineEvents({
      // We rely on entityType to determine Events vs Alerts
      alertConsumers: SECURITY_ALERTS_CONSUMERS,
      data,
      dataViewId,
      endDate: end,
      entityType,
      fields,
      filterQuery,
      id: tableId,
      indexNames: indexNames ?? selectedPatterns,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
      filterStatus: currentFilter,
    });

  useEffect(() => {
    dispatch(dataTableActions.updateIsLoading({ id: tableId, isLoading: loading }));
  }, [dispatch, tableId, loading]);

  const deleteQuery = useCallback(
    ({ id }) => dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id })),
    [dispatch]
  );

  useQueryInspector({
    queryId: tableId,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const hasAlerts = totalCountMinusDeleted > 0;

  // Only show the table-spanning loading indicator when the query is loading and we
  // don't have data (e.g. for the initial fetch).
  // Subsequent fetches (e.g. for pagination) will show a small loading indicator on
  // top of the table and the table will display the current page until the next page
  // is fetched. This prevents a flicker when paginating.
  const showFullLoading = loading && !hasAlerts;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );
  useEffect(() => {
    setQuery({ id: tableId, inspect, loading, refetch });
  }, [inspect, loading, refetch, setQuery, tableId]);

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(dataTableActions.clearSelected({ id: tableId }));
    dispatch(
      dataTableActions.setDataTableSelectAll({
        id: tableId,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch, tableId]);

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) => {
      dispatch(
        dataTableActions.updateItemsPerPage({ id: tableId, itemsPerPage: itemsChangedPerPage })
      );
    },
    [tableId, dispatch]
  );

  const onChangePage = useCallback(
    (page) => {
      loadPage(page);
    },
    [loadPage]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(dataTableActions.setEventsLoading({ id: tableId, eventIds, isLoading }));
    },
    [dispatch, tableId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(dataTableActions.setEventsDeleted({ id: tableId, eventIds, isDeleted }));
    },
    [dispatch, tableId]
  );

  const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

  const onRowSelected: OnRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
      setSelected({
        id: tableId,
        eventIds: getEventIdToDataMapping(
          nonDeletedEvents,
          eventIds,
          queryFields,
          hasCrudPermissions
        ),
        isSelected,
        isSelectAllChecked: isSelected && selectedCount + 1 === nonDeletedEvents.length,
      });
    },
    [setSelected, tableId, nonDeletedEvents, queryFields, hasCrudPermissions, selectedCount]
  );

  const onSelectPage: OnSelectAll = useCallback(
    ({ isSelected }: { isSelected: boolean }) =>
      isSelected
        ? setSelected({
            id: tableId,
            eventIds: getEventIdToDataMapping(
              nonDeletedEvents,
              nonDeletedEvents.map((event) => event._id),
              queryFields,
              hasCrudPermissions
            ),
            isSelected,
            isSelectAllChecked: isSelected,
          })
        : clearSelected({ id: tableId }),
    [setSelected, tableId, nonDeletedEvents, queryFields, hasCrudPermissions, clearSelected]
  );

  // Sync to selectAll so parent components can select all events
  useEffect(() => {
    if (selectAll && !isSelectAllChecked) {
      onSelectPage({ isSelected: true });
    }
  }, [isSelectAllChecked, onSelectPage, selectAll]);

  const [transformedLeadingControlColumns] = useMemo(() => {
    return [
      showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
    ].map((controlColumns) =>
      transformControlColumns({
        columnHeaders,
        controlColumns,
        data: nonDeletedEvents,
        fieldBrowserOptions,
        loadingEventIds,
        onRowSelected,
        onRuleChange,
        selectedEventIds,
        showCheckboxes,
        tabType: 'query',
        timelineId: tableId,
        isSelectAllChecked,
        sort,
        browserFields,
        onSelectPage,
        theme,
        setEventsLoading,
        setEventsDeleted,
        pageSize: itemsPerPage,
      })
    );
  }, [
    showCheckboxes,
    leadingControlColumns,
    columnHeaders,
    nonDeletedEvents,
    fieldBrowserOptions,
    loadingEventIds,
    onRowSelected,
    onRuleChange,
    selectedEventIds,
    tableId,
    isSelectAllChecked,
    sort,
    browserFields,
    onSelectPage,
    theme,
    setEventsLoading,
    setEventsDeleted,
    itemsPerPage,
  ]);

  const alertBulkActions = useAlertBulkActions({
    tableId,
    data: nonDeletedEvents,
    totalItems: totalCountMinusDeleted,
    hasAlertsCrud: hasCrudPermissions,
    showCheckboxes,
    filterStatus: currentFilter,
    filterQuery,
    bulkActions,
    selectedCount,
  });

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
  });

  const unitCountText = useMemo(
    () => `${totalCountMinusDeleted.toLocaleString()} ${unit(totalCountMinusDeleted)}`,
    [totalCountMinusDeleted, unit]
  );

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (tableView === 'eventRenderedView') {
      return {
        defaultHeight: 'auto' as const,
      };
    }
    return undefined;
  }, [tableView]);

  const pagination = useMemo(
    () => ({
      pageIndex: pageInfo.activePage,
      pageSize: itemsPerPage,
      pageSizeOptions: itemsPerPageOptions,
      onChangeItemsPerPage,
      onChangePage,
    }),
    [itemsPerPage, itemsPerPageOptions, onChangeItemsPerPage, onChangePage, pageInfo.activePage]
  );

  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <StyledEuiPanel
            hasBorder={false}
            hasShadow={false}
            paddingSize="none"
            data-test-subj="events-viewer-panel"
            $isFullScreen={globalFullScreen}
          >
            {showFullLoading && <TableLoading height="short" />}

            {graphOverlay}

            {canQueryTimeline && (
              <TableContext.Provider value={tableContext}>
                <EventsContainerLoading
                  data-timeline-id={tableId}
                  data-test-subj={`events-container-loading-${loading}`}
                >
                  <RightTopMenu
                    tableView={tableView}
                    loading={loading}
                    tableId={tableId}
                    title={title}
                    onViewChange={(selectedView) => setTableView(selectedView)}
                    additionalFilters={additionalFilters}
                    hasRightOffset={tableView === 'gridView' && nonDeletedEvents.length > 0}
                    additionalMenuOptions={additionalRightMenuOptions}
                  />

                  {!hasAlerts && !loading && !graphOverlay && <EmptyTable />}
                  {hasAlerts && (
                    <FullWidthFlexGroupTable
                      $visible={!graphEventId && graphOverlay == null}
                      gutterSize="none"
                    >
                      <ScrollableFlexItem grow={1}>
                        <StatefulEventContext.Provider value={activeStatefulEventContext}>
                          <DataTableComponent
                            cellActionsTriggerId={cellActionsTriggerId}
                            additionalControls={alertBulkActions}
                            unitCountText={unitCountText}
                            browserFields={browserFields}
                            data={nonDeletedEvents}
                            id={tableId}
                            loadPage={loadPage}
                            // TODO: migrate away from deprecated type
                            renderCellValue={
                              renderCellValue as (
                                props: DeprecatedCellValueElementProps
                              ) => React.ReactNode
                            }
                            // TODO: migrate away from deprecated type
                            rowRenderers={rowRenderers as unknown as DeprecatedRowRenderer[]}
                            totalItems={totalCountMinusDeleted}
                            bulkActions={bulkActions}
                            fieldBrowserOptions={fieldBrowserOptions}
                            hasCrudPermissions={hasCrudPermissions}
                            leadingControlColumns={transformedLeadingControlColumns}
                            pagination={pagination}
                            isEventRenderedView={tableView === 'eventRenderedView'}
                            rowHeightsOptions={rowHeightsOptions}
                            getFieldBrowser={getFieldBrowser}
                            getFieldSpec={getFieldSpec}
                          />
                        </StatefulEventContext.Provider>
                      </ScrollableFlexItem>
                    </FullWidthFlexGroupTable>
                  )}
                </EventsContainerLoading>
              </TableContext.Provider>
            )}
          </StyledEuiPanel>
        </InspectButtonContainer>
      </FullScreenContainer>
      {DetailsPanel}
    </>
  );
};

const mapDispatchToProps = {
  clearSelected: dataTableActions.clearSelected,
  setSelected: dataTableActions.setSelected,
};

const connector = connect(undefined, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer: React.FunctionComponent<EventsViewerProps> = connector(
  StatefulEventsViewerComponent
);
