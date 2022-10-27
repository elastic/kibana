/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { Direction, EntityType, RowRenderer } from '@kbn/timelines-plugin/common';
import { isEmpty } from 'lodash';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { Sort } from '../../../timelines/components/timeline/body/sort';
import type { DataTableCellAction } from '../../../../common/data_table/columns';
import type { ControlColumnProps } from '../../../../common/types';
import { dataTableActions, dataTableSelectors } from '../../store/data_table';
import { InputsModelId } from '../../store/inputs/constants';
import { useBulkAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_bulk_add_to_case_actions';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InspectButtonContainer } from '../inspect';
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
import type { SubsetTGridModel } from '../../store/data_table/model';
import {
  EventsContainerLoading,
  FullWidthFlexGroupTable,
  ScrollableFlexItem,
  StyledEuiPanel,
  UpdatedFlexGroup,
  UpdatedFlexItem,
} from './styles';
import type { ViewSelection } from '../event_rendered_view/selector';
import { SummaryViewSelector } from '../event_rendered_view/selector';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { defaultHeaders } from '../data_table/column_headers/default_headers';
import { getDefaultViewSelection, resolverIsShowing, getCombinedFilterQuery } from './helpers';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../event_rendered_view/helpers';
import { useTimelineEvents } from './use_timelines_events';
import { TableContext, TGridEmpty, TGridLoading } from './shared';
import type { TableId } from '../../store/data_table/types';
import { InspectButton } from '../data_table/inspect';
import { StatefulDataTableComponent } from '../data_table';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../lib/cell_actions/constants';
import type { AlertWorkflowStatus } from '../../types';
import { StatefulEventRenderedView } from '../event_rendered_view';

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
  defaultModel: SubsetTGridModel;
  end: string;
  entityType: EntityType;
  tableId: TableId;
  leadingControlColumns: ControlColumnProps[];
  scopeId: SourcererScopeName;
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
  scopeId,
  additionalFilters,
  hasAlertsCrud = false,
  unit,
}) => {
  const dispatch = useDispatch();
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
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));

  const [tableView, setTableView] = useState<ViewSelection>(
    getDefaultViewSelection({
      timelineId: tableId,
      value: storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY),
    })
  );

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);
  const {
    browserFields,
    dataViewId,
    indexPattern,
    runtimeMappings,
    selectedPatterns,
    dataViewId: selectedDataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(scopeId);

  const { globalFullScreen } = useGlobalFullScreen();
  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );
  const editorActionsRef = useRef<FieldEditorActions>(null);

  useEffect(() => {
    dispatch(
      dataTableActions.createTGrid({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: tableId,
        indexNames: selectedPatterns,
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
    (inspect, loading, refetch) => {
      dispatch(
        inputsActions.setQuery({
          id: tableId,
          inputId: InputsModelId.global,
          inspect,
          loading,
          refetch,
        })
      );
    },
    [dispatch, tableId]
  );

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
    sourcererScope: scopeId,
    editorActionsRef,
    upsertColumn: (column, index) =>
      dispatch(dataTableActions.upsertColumn({ column, id: tableId, index })),
    removeColumn: (columnId) => dispatch(dataTableActions.removeColumn({ columnId, id: tableId })),
  });

  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';
  const tableContext = useMemo(() => ({ tableId }), [tableId]);

  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings, data } = useKibana().services;

  const getManageDataTable = useMemo(() => dataTableSelectors.getManageDataTableById(), []);

  const { queryFields } = useDeepEqualSelector((state) => getManageDataTable(state, tableId));

  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders: [],
        filters,
        from: start,
        indexPattern,
        kqlMode: 'filter',
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, indexPattern, browserFields, filters, start, end, query]
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
    () => [...columnsHeader.map((c: { id: any }) => c.id), ...(queryFields ?? [])],
    [columnsHeader, queryFields]
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
      indexNames: selectedPatterns,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
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
    setQuery(inspect, loading, refetch);
  }, [inspect, loading, refetch, setQuery]);

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(dataTableActions.clearSelected({ id: tableId }));
    dispatch(
      dataTableActions.setTGridSelectAll({
        id: tableId,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch, tableId]);
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
              data-test-subj="updated-flex-group"
              gutterSize="m"
              justifyContent="flexEnd"
              $view={tableView}
            >
              <UpdatedFlexItem grow={false} $show={!loading}>
                <InspectButton title={justTitle} inspect={inspect} loading={loading} />
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
                {showFullLoading && <TGridLoading height="short" />}

                {graphOverlay}

                {!hasAlerts && !loading && !graphOverlay && <TGridEmpty height="short" />}
                {hasAlerts && (
                  <FullWidthFlexGroupTable
                    $visible={!graphEventId && graphOverlay == null}
                    gutterSize="none"
                  >
                    <ScrollableFlexItem grow={1}>
                      <StatefulDataTableComponent
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
                        unit={unit}
                        filters={filters}
                        filterStatus={currentFilter}
                        onRuleChange={onRuleChange}
                        leadingControlColumns={leadingControlColumns}
                      />
                      {tableView === 'eventRenderedView' && (
                        <StatefulEventRenderedView
                          events={events}
                          leadingControlColumns={leadingControlColumns}
                          pageIndex={pageInfo.activePage}
                          pageSize={pageInfo.querySize}
                          pageSizeOptions={itemsPerPageOptions}
                          rowRenderers={rowRenderers}
                          tableId={tableId}
                          totalItemCount={totalCountMinusDeleted}
                          loadPage={loadPage}
                          indexNames={selectedPatterns}
                          refetch={refetch}
                          unit={unit}
                          hasAlertsCrud={hasAlertsCrud}
                          filterQuery={filterQuery}
                          filterStatus={currentFilter}
                          bulkActions={bulkActions}
                          browserFields={browserFields}
                          disabledCellActions={FIELDS_WITHOUT_CELL_ACTIONS}
                          tabType={'query'}
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
