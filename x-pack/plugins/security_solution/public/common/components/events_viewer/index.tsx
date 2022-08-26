/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useCallback, useMemo, useEffect, useState, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { TGridCellAction } from '@kbn/timelines-plugin/common/types';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { resolverIsShowing } from '../../../timelines/components/timeline/helpers';
import { useBulkAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_bulk_add_to_case_actions';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import type { ControlColumnProps, RowRenderer } from '../../../../common/types/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { APP_UI_ID } from '../../../../common/constants';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import type { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { InspectButton, InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { eventsViewerSelector } from './selectors';
import type { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import type { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../lib/cell_actions/constants';
import { useKibana } from '../../lib/kibana';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import type { FieldEditorActions } from '../../../timelines/components/fields_browser';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import {
  useSessionViewNavigation,
  useSessionView,
} from '../../../timelines/components/timeline/session_tab_content/use_session_view';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { ViewSelection } from '../event_rendered_view/selector';
import { SummaryViewSelector } from '../event_rendered_view/selector';
import { EventRenderedView } from '../event_rendered_view';
import { AlertCount } from './styles';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));
const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export const UpdatedFlexGroup = styled(EuiFlexGroup)<{ $view?: ViewSelection }>`
  ${({ $view, theme }) => ($view === 'gridView' ? `margin-right: ${theme.eui.euiSizeXL};` : '')}
  position: absolute;
  z-index: ${({ theme }) => theme.eui.euiZLevel1 - 3};
  right: 0px;
`;

export const UpdatedFlexItem = styled(EuiFlexItem)<{ $show: boolean }>`
  ${({ $show }) => ($show ? '' : 'visibility: hidden;')}
`;

const TitleText = styled.span`
  margin-right: 12px;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

export interface Props {
  defaultCellActions?: TGridCellAction[];
  defaultModel: SubsetTimelineModel;
  end: string;
  entityType: EntityType;
  id: TimelineId;
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
  id,
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
    timelineQuery,
    timeline: {
      columns,
      dataProviders,
      defaultColumns,
      deletedEventIds,
      excludedRowRendererIds,
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sessionViewConfig,
      showCheckboxes,
      sort,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, id));

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
      timelineActions.createTimeline({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        excludedRowRendererIds,
        id,
        indexNames: selectedPatterns,
        itemsPerPage,
        showCheckboxes,
        sort,
      })
    );

    return () => {
      dispatch(inputsActions.deleteOneQuery({ id, inputId: 'global' }));
      if (editorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        editorActionsRef.current.closeEditor();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);
  const trailingControlColumns: ControlColumnProps[] = EMPTY_CONTROL_COLUMNS;

  const { Navigation } = useSessionViewNavigation({
    timelineId: id,
  });

  const { DetailsPanel, SessionView } = useSessionView({
    entityType,
    timelineId: id,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay timelineId={id} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, id, sessionViewConfig, SessionView, Navigation]);
  const setQuery = useCallback(
    (inspect, loading, refetch) => {
      dispatch(inputsActions.setQuery({ id, inputId: 'global', inspect, loading, refetch }));
    },
    [dispatch, id]
  );

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const bulkActions = useMemo(
    () => ({
      onAlertStatusActionSuccess: () => {
        if (id === TimelineId.active) {
          refetchQuery([timelineQuery]);
        } else {
          refetchQuery(globalQueries);
        }
      },
      customBulkActions: addToCaseBulkActions,
    }),
    [addToCaseBulkActions, globalQueries, id, timelineQuery]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: scopeId,
    timelineId: id,
    editorActionsRef,
  });

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

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const hasAlerts = totalCountMinusDeleted > 0;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );

  const isLive = input.policy.kind === 'interval';
  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);
  const [tableView, setTableView] = useState<ViewSelection>('gridView');
  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';

  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
  const alertToolbar = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <AlertCount>{alertCountText}</AlertCount>
        </EuiFlexItem>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <StatefulAlertBulkActions
            showAlertStatusActions={showAlertStatusActions}
            data-test-subj="bulk-actions"
            id={id}
            totalItems={totalSelectAllAlerts ?? totalItems}
            filterStatus={filterStatus}
            query={filterQuery}
            indexName={indexNames.join()}
            onActionSuccess={onAlertStatusActionSuccess}
            onActionFailure={onAlertStatusActionFailure}
            customBulkActions={additionalBulkActions}
            refetch={refetch}
          />
        </Suspense>
      </EuiFlexGroup>
    ),
    [
      additionalBulkActions,
      alertCountText,
      filterQuery,
      filterStatus,
      id,
      indexNames,
      onAlertStatusActionFailure,
      onAlertStatusActionSuccess,
      refetch,
      showAlertStatusActions,
      totalItems,
      totalSelectAllAlerts,
    ]
  );
  const { queryFields, title } = useDeepEqualSelector((state) =>
    getManageTimeline(state, id ?? '')
  );

  const onChangePage = useCallback(
    (page) => {
      loadPage(page);
    },
    [loadPage]
  );

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) => {
      dispatch(timelineActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }));
    },
    [id, dispatch]
  );

  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <UpdatedFlexGroup
            alignItems={alignItems}
            data-test-subj="updated-flex-group"
            gutterSize="m"
            justifyContent="flexEnd"
            $view={tableView}
          >
            <UpdatedFlexItem grow={false} $show={!loading}>
              <InspectButton title={justTitle} queryId={'test'} />
            </UpdatedFlexItem>
            <UpdatedFlexItem grow={false} $show={!loading}>
              {!resolverIsShowing(graphEventId) && additionalFilters}
            </UpdatedFlexItem>
            {tGridEventRenderedViewEnabled &&
              ['detections-page', 'detections-rules-details-page'].includes(id) && (
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <SummaryViewSelector viewSelected={tableView} onViewChange={setTableView} />
                </UpdatedFlexItem>
              )}
          </UpdatedFlexGroup>
          <FullWidthFlexGroup $visible={!graphEventId} gutterSize="none">
            <ScrollableFlexItem grow={1}>
              {tableView === 'gridView' &&
                timelinesUi.getTGrid<'embedded'>({
                  appId: APP_UI_ID,
                  browserFields,
                  bulkActions,
                  columns,
                  dataProviders,
                  dataViewId,
                  defaultCellActions,
                  deletedEventIds,
                  disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
                  end,
                  entityType,
                  fieldBrowserOptions,
                  filters: globalFilters,
                  filterStatus: currentFilter,
                  globalFullScreen,
                  hasAlertsCrud,
                  id,
                  indexNames: selectedPatterns,
                  indexPattern,
                  isLive,
                  isLoadingIndexPattern,
                  itemsPerPage,
                  itemsPerPageOptions,
                  kqlMode,
                  leadingControlColumns,
                  onRuleChange,
                  query,
                  renderCellValue,
                  rowRenderers,
                  runtimeMappings,
                  setQuery,
                  sort,
                  start,
                  trailingControlColumns,
                  type: 'embedded',
                  unit,
                })}
              {tableView === 'eventRenderedView' && (
                <EventRenderedView
                  appId={APP_UI_ID}
                  alertToolbar={alertToolbar}
                  events={events}
                  leadingControlColumns={leadingTGridControlColumns ?? []}
                  onChangePage={onChangePage}
                  onChangeItemsPerPage={onChangeItemsPerPage}
                  pageIndex={pageInfo.activePage}
                  pageSize={pageInfo.pageSize}
                  pageSizeOptions={itemsPerPageOptions}
                  rowRenderers={rowRenderers}
                  totalItemCount={totalCountMinusDeleted}
                />
              )}
              {graphOverlay}
            </ScrollableFlexItem>
          </FullWidthFlexGroup>
        </InspectButtonContainer>
      </FullScreenContainer>
      {DetailsPanel}
    </>
  );
};

export const StatefulEventsViewer = React.memo(StatefulEventsViewerComponent);
