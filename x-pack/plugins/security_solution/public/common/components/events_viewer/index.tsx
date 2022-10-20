/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { EntityType, RowRenderer } from '@kbn/timelines-plugin/common';
import type { TGridCellAction } from '@kbn/timelines-plugin/common/types';
import type { ControlColumnProps, TableId } from '../../../../common/types';
import { dataTableActions } from '../../store/data_table';
import { InputsModelId } from '../../store/inputs/constants';
import { useBulkAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_bulk_add_to_case_actions';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
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
  StyledEuiPanel,
  UpdatedFlexGroup,
  UpdatedFlexItem,
} from './styles';
import type { ViewSelection } from '../event_rendered_view/selector';
import { SummaryViewSelector } from '../event_rendered_view/selector';

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

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

export interface Props {
  defaultCellActions?: TGridCellAction[];
  defaultModel: SubsetTGridModel;
  end: string;
  entityType: EntityType;
  tableId: TableId;
  leadingControlColumns: ControlColumnProps[];
  scopeId: SourcererScopeName;
  start: string;
  showTotalCount?: boolean;
  pageFilters?: Filter[];
  currentFilter?: Status;
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
    input,
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
    getDefaultViewSelection({ timelineId: id, value: storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY) })
  );

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const { timelines: timelinesUi } = useKibana().services;
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

  // Only show the table-spanning loading indicator when the query is loading and we
  // don't have data (e.g. for the initial fetch).
  // Subsequent fetches (e.g. for pagination) will show a small loading indicator on
  // top of the table and the table will display the current page until the next page
  // is fetched. This prevents a flicker when paginating.
  const showFullLoading = loading && !hasAlerts;

  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';
  const tableContext = useMemo(() => ({ tableId: id }), [id]);

  const isLive = input.policy.kind === 'interval';
  // -----------------------------------------------
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;

  const getManageDataTable = useMemo(() => tGridSelectors.getManageDataTableById(), []);

  const { queryFields } = useDeepEqualSelector((state) => getManageDataTable(state, id ?? ''));

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
    () => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])],
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
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
      id,
      indexNames,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
    });

  useEffect(() => {
    dispatch(tGridActions.updateIsLoading({ id, isLoading: loading }));
  }, [dispatch, id, loading]);

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const hasAlerts = totalCountMinusDeleted > 0;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );
  useEffect(() => {
    setQuery(inspect, loading, refetch);
  }, [inspect, loading, refetch, setQuery]);

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(tGridActions.clearSelected({ id }));
    dispatch(
      tGridActions.setTGridSelectAll({
        id,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch, id]);
  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <EventsContainerLoading
            data-timeline-id={id}
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
                ['alerts-page', 'alerts-rules-details-page'].includes(id) && (
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
                    <ScrollableFlexItem grow={1}> </ScrollableFlexItem>
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
