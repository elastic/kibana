/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useRef, useCallback, useMemo, useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled, { ThemeContext } from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { Direction, EntityType, RowRenderer } from '@kbn/timelines-plugin/common';
import { isEmpty } from 'lodash';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { Sort } from '../../../timelines/components/timeline/body/sort';
import type {
  ControlColumnProps,
  DataTableCellAction,
  OnRowSelected,
  OnSelectAll,
  SetEventsDeleted,
  SetEventsLoading,
  TableId,
} from '../../../../common/types';
import { dataTableActions } from '../../store/data_table';
import { InputsModelId } from '../../store/inputs/constants';
import { useBulkAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_bulk_add_to_case_actions';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InspectButton, InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
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
import type { SubsetDataTableModel } from '../../store/data_table/model';
import {
  EventsContainerLoading,
  FullWidthFlexGroupTable,
  ScrollableFlexItem,
  StyledEuiPanel,
  UpdatedFlexGroup,
  UpdatedFlexItem,
} from './styles';
import { getDefaultViewSelection, resolverIsShowing, getCombinedFilterQuery } from './helpers';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../event_rendered_view/helpers';
import { useTimelineEvents } from './use_timelines_events';
import { TableContext, EmptyTable, TableLoading } from './shared';
import { StatefulDataTableComponent } from '../data_table';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../lib/cell_actions/constants';
import type { AlertWorkflowStatus } from '../../types';
import { EventRenderedView } from '../event_rendered_view';
import { useQueryInspector } from '../page/manage_query';
import type { SetQuery } from '../../containers/use_global_time/types';
import { defaultHeaders } from '../../store/data_table/defaults';
import { checkBoxControlColumn, transformControlColumns } from '../control_columns';
import { getEventIdToDataMapping } from '../data_table/helpers';
import type { ViewSelection } from './summary_view_select';
import { SummaryViewSelector } from './summary_view_select';
import { useAlertBulkActions } from './use_alert_bulk_actions';

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

const storage = new Storage(localStorage);

const TitleText = styled.span`
  margin-right: 12px;
`;

const SECURITY_ALERTS_CONSUMERS = [AlertConsumers.SIEM];

export interface Props {
  defaultCellActions?: DataTableCellAction[];
  defaultModel: SubsetDataTableModel;
  end: string;
  entityType: EntityType;
  tableId: TableId;
  leadingControlColumns: ControlColumnProps[];
  sourcererScope: SourcererScopeName;
  start: string;
  showTotalCount?: boolean;
  pageFilters?: Filter[];
  currentFilter?: AlertWorkflowStatus;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  additionalFilters?: React.ReactNode;
  hasAlertsCrud?: boolean;
  unit?: (n: number) => string;
  indexNames?: string[];
}

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<Props> = ({
  defaultCellActions,
  defaultModel,
  end,
  entityType,
  tableId,
  leadingControlColumns,
  pageFilters,
  currentFilter,
  onRuleChange,
  renderCellValue,
  rowRenderers,
  start,
  sourcererScope,
  additionalFilters,
  hasAlertsCrud = false,
  unit,
  indexNames,
}) => {
  const dispatch = useDispatch();
  const theme: EuiTheme = useContext(ThemeContext);
  const tableContext = useMemo(() => ({ tableId }), [tableId]);

  const {
    filters,
    query,
    globalQueries,
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
      title,
      initialized,
      selectedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      queryFields,
      selectAll,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));

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

  const { globalFullScreen } = useGlobalFullScreen();
  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );

  const editorActionsRef = useRef<FieldEditorActions>(null);
  useEffect(() => {
    if (!initialized) {
      console.log('createDataTable');
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
    }
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

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const bulkActions = useMemo(
    () => ({
      onAlertStatusActionSuccess: () => {
        refetchQuery(globalQueries);
      },
      customBulkActions: addToCaseBulkActions,
    }),
    [addToCaseBulkActions, globalQueries]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope,
    editorActionsRef,
    upsertColumn: (column, index) =>
      dispatch(dataTableActions.upsertColumn({ column, id: tableId, index })),
    removeColumn: (columnId) => dispatch(dataTableActions.removeColumn({ columnId, id: tableId })),
  });

  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';

  const columnHeaders = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings, data } = useKibana().services;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => [...columnHeaders.map((c: { id: any }) => c.id), ...(queryFields ?? [])],
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
    });

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

  useEffect(() => {
    dispatch(dataTableActions.updateIsLoading({ id: tableId, isLoading: loading }));
  }, [dispatch, tableId, loading]);

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
      dataTableActions.setSelected({
        id: tableId,
        eventIds: getEventIdToDataMapping(events, eventIds, queryFields, hasAlertsCrud ?? false),
        isSelected,
        isSelectAllChecked: isSelected && selectedCount + 1 === events.length,
      });
    },
    [tableId, events, queryFields, hasAlertsCrud, selectedCount]
  );

  const onSelectPage: OnSelectAll = useCallback(
    ({ isSelected }: { isSelected: boolean }) =>
      isSelected
        ? dataTableActions.setSelected({
            id: tableId,
            eventIds: getEventIdToDataMapping(
              events,
              events.map((event) => event._id),
              queryFields ?? [],
              hasAlertsCrud ?? false
            ),
            isSelected,
            isSelectAllChecked: isSelected,
          })
        : dataTableActions.clearSelected({ id: tableId }),
    [tableId, events, queryFields, hasAlertsCrud]
  );

  // Sync to selectAll so parent components can select all events
  useEffect(() => {
    if (selectAll && !isSelectAllChecked) {
      onSelectPage({ isSelected: true });
    }
  }, [isSelectAllChecked, onSelectPage, selectAll]);

  const [leadingTGridControlColumns] = useMemo(() => {
    return [
      showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
    ].map((controlColumns) =>
      transformControlColumns({
        columnHeaders,
        controlColumns,
        data: events,
        disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
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
        pageSize: pageInfo.querySize,
      })
    );
  }, [
    showCheckboxes,
    leadingControlColumns,
    columnHeaders,
    events,
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
    pageInfo.querySize,
  ]);

  const alertToolbar = useAlertBulkActions({
    tableId,
    data: events,
    totalItems: totalCountMinusDeleted,
    refetch,
    indexNames: selectedPatterns,
    hasAlertsCrud,
    showCheckboxes,
    filterStatus: currentFilter,
    filterQuery,
    bulkActions,
    selectedCount,
    unit,
  });

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

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

  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <EventsContainerLoading
            data-timeline-id={tableId}
            data-test-subj={`events-container-loading-${loading}`}
          >
            <UpdatedFlexGroup
              alignItems={alignItems}
              data-test-subj="events-viewer-updated"
              gutterSize="m"
              justifyContent="flexEnd"
              $view={tableView}
            >
              <UpdatedFlexItem grow={false} $show={!loading}>
                <InspectButton title={justTitle} queryId={tableId} />
              </UpdatedFlexItem>
              <UpdatedFlexItem grow={false} $show={!loading}>
                {!resolverIsShowing(graphEventId) && additionalFilters}
              </UpdatedFlexItem>
              {tGridEventRenderedViewEnabled &&
                ['alerts-page', 'alerts-rules-details-page'].includes(tableId) && (
                  <UpdatedFlexItem grow={false} $show={!loading}>
                    <SummaryViewSelector viewSelected={tableView} onViewChange={setTableView} />
                  </UpdatedFlexItem>
                )}
            </UpdatedFlexGroup>
            <TableContext.Provider value={tableContext}>
              <StyledEuiPanel
                hasBorder={false}
                hasShadow={false}
                paddingSize="none"
                data-test-subj="events-viewer-panel"
                $isFullScreen={globalFullScreen}
              >
                {showFullLoading && <TableLoading height="short" />}

                {graphOverlay}

                {!hasAlerts && !loading && !graphOverlay && <EmptyTable height="short" />}
                {hasAlerts && (
                  <FullWidthFlexGroupTable
                    $visible={!graphEventId && graphOverlay == null}
                    gutterSize="none"
                  >
                    <ScrollableFlexItem grow={1}>
                      {tableView === 'gridView' && (
                        <StatefulDataTableComponent
                          alertToolbar={alertToolbar}
                          activePage={pageInfo.activePage}
                          browserFields={browserFields}
                          data={nonDeletedEvents}
                          disabledCellActions={FIELDS_WITHOUT_CELL_ACTIONS}
                          id={tableId}
                          indexNames={selectedPatterns}
                          itemsPerPageOptions={itemsPerPageOptions}
                          loadPage={loadPage}
                          pageSize={pageInfo.querySize}
                          refetch={refetch}
                          renderCellValue={renderCellValue}
                          rowRenderers={rowRenderers}
                          tabType={'query'}
                          totalItems={totalCountMinusDeleted}
                          bulkActions={bulkActions}
                          fieldBrowserOptions={fieldBrowserOptions}
                          defaultCellActions={defaultCellActions}
                          filterQuery={filterQuery}
                          hasAlertsCrud={hasAlertsCrud}
                          showCheckboxes={showCheckboxes}
                          filters={filters}
                          filterStatus={currentFilter}
                          onRuleChange={onRuleChange}
                          leadingControlColumns={leadingTGridControlColumns}
                        />
                      )}
                      {tableView === 'eventRenderedView' && (
                        <EventRenderedView
                          events={events}
                          leadingControlColumns={leadingTGridControlColumns}
                          pageIndex={pageInfo.activePage}
                          pageSize={pageInfo.querySize}
                          pageSizeOptions={itemsPerPageOptions}
                          rowRenderers={rowRenderers}
                          scopeId={tableId}
                          totalItemCount={totalCountMinusDeleted}
                          onChangePage={onChangePage}
                          onChangeItemsPerPage={onChangeItemsPerPage}
                          alertToolbar={alertToolbar}
                        />
                      )}
                    </ScrollableFlexItem>
                  </FullWidthFlexGroupTable>
                )}
              </StyledEuiPanel>
            </TableContext.Provider>
          </EventsContainerLoading>
        </InspectButtonContainer>
      </FullScreenContainer>
      {DetailsPanel}
    </>
  );
};

export const StatefulEventsViewer = React.memo(StatefulEventsViewerComponent);
