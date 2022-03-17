/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { ControlColumnProps, RowRenderer, TimelineId } from '../../../../common/types/timeline';
import { APP_ID, APP_UI_ID } from '../../../../common/constants';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import type { SubsetTimelineModel, TimelineModel } from '../../../timelines/store/timeline/model';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import type { EntityType } from '../../../../../timelines/common';
import { TGridCellAction } from '../../../../../timelines/common/types';
import { DetailsPanel } from '../../../timelines/components/side_panel';
import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../lib/cell_actions/constants';
import { useGetUserCasesPermissions, useKibana } from '../../lib/kibana';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import {
  useFieldBrowserOptions,
  FieldEditorActions,
} from '../../../timelines/components/fields_browser';

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export interface OwnProps {
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
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
  additionalFilters?: React.ReactNode;
  hasAlertsCrud?: boolean;
  unit?: (n: number) => string;
}

type Props = OwnProps & PropsFromRedux;

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<Props> = ({
  createTimeline,
  columns,
  defaultColumns,
  dataProviders,
  defaultCellActions,
  deletedEventIds,
  deleteEventQuery,
  end,
  entityType,
  excludedRowRendererIds,
  filters,
  globalQuery,
  id,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  leadingControlColumns,
  pageFilters,
  currentFilter,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  start,
  scopeId,
  showCheckboxes,
  sort,
  timelineQuery,
  utilityBar,
  additionalFilters,
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId,
  hasAlertsCrud = false,
  unit,
}) => {
  const dispatch = useDispatch();
  const { timelines: timelinesUi, cases } = useKibana().services;
  const {
    browserFields,
    dataViewId,
    docValueFields,
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
    if (createTimeline != null) {
      createTimeline({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        excludedRowRendererIds,
        id,
        indexNames: selectedPatterns,
        itemsPerPage,
        showCheckboxes,
        sort,
      });
    }
    return () => {
      deleteEventQuery({ id, inputId: 'global' });
      if (editorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        editorActionsRef.current.closeEditor();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);
  const trailingControlColumns: ControlColumnProps[] = EMPTY_CONTROL_COLUMNS;
  const graphOverlay = useMemo(
    () =>
      graphEventId != null && graphEventId.length > 0 ? <GraphOverlay timelineId={id} /> : null,
    [graphEventId, id]
  );
  const setQuery = useCallback(
    (inspect, loading, refetch) => {
      dispatch(inputsActions.setQuery({ id, inputId: 'global', inspect, loading, refetch }));
    },
    [dispatch, id]
  );

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };
  const onAlertStatusActionSuccess = useCallback(() => {
    if (id === TimelineId.active) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
    }
  }, [id, timelineQuery, globalQuery]);
  const bulkActions = useMemo(() => ({ onAlertStatusActionSuccess }), [onAlertStatusActionSuccess]);

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: scopeId,
    timelineId: id,
    editorActionsRef,
  });

  const casesPermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();

  return (
    <>
      <CasesContext owner={[APP_ID]} userCanCrud={casesPermissions?.crud ?? false}>
        <FullScreenContainer $isFullScreen={globalFullScreen}>
          <InspectButtonContainer>
            {timelinesUi.getTGrid<'embedded'>({
              additionalFilters,
              appId: APP_UI_ID,
              browserFields,
              bulkActions,
              columns,
              dataProviders,
              dataViewId,
              defaultCellActions,
              deletedEventIds,
              disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
              docValueFields,
              end,
              entityType,
              fieldBrowserOptions,
              filters: globalFilters,
              filterStatus: currentFilter,
              globalFullScreen,
              graphEventId,
              graphOverlay,
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
              tGridEventRenderedViewEnabled,
              trailingControlColumns,
              type: 'embedded',
              unit,
            })}
          </InspectButtonContainer>
        </FullScreenContainer>
        <DetailsPanel
          browserFields={browserFields}
          entityType={entityType}
          docValueFields={docValueFields}
          isFlyoutView
          runtimeMappings={runtimeMappings}
          timelineId={id}
        />
      </CasesContext>
    </>
  );
};

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { id, defaultModel }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const timeline: TimelineModel = getTimeline(state, id) ?? defaultModel;
    const {
      columns,
      defaultColumns,
      dataProviders,
      deletedEventIds,
      excludedRowRendererIds,
      graphEventId,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
      showCheckboxes,
    } = timeline;

    return {
      columns,
      defaultColumns,
      dataProviders,
      deletedEventIds,
      excludedRowRendererIds,
      filters: getGlobalFiltersQuerySelector(state),
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
      showCheckboxes,
      // Used to determine whether the footer should show (since it is hidden if the graph is showing.)
      // `getTimeline` actually returns `TimelineModel | undefined`
      graphEventId,
      globalQuery: getGlobalQueries(state),
      timelineQuery: getTimelineQuery(state, id),
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer = connector(
  React.memo(
    StatefulEventsViewerComponent,
    // eslint-disable-next-line complexity
    (prevProps, nextProps) =>
      prevProps.id === nextProps.id &&
      prevProps.scopeId === nextProps.scopeId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      prevProps.defaultCellActions === nextProps.defaultCellActions &&
      deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
      prevProps.deletedEventIds === nextProps.deletedEventIds &&
      prevProps.end === nextProps.end &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      prevProps.kqlMode === nextProps.kqlMode &&
      prevProps.leadingControlColumns === nextProps.leadingControlColumns &&
      deepEqual(prevProps.query, nextProps.query) &&
      prevProps.renderCellValue === nextProps.renderCellValue &&
      prevProps.rowRenderers === nextProps.rowRenderers &&
      deepEqual(prevProps.sort, nextProps.sort) &&
      prevProps.start === nextProps.start &&
      deepEqual(prevProps.pageFilters, nextProps.pageFilters) &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.start === nextProps.start &&
      prevProps.utilityBar === nextProps.utilityBar &&
      prevProps.additionalFilters === nextProps.additionalFilters &&
      prevProps.graphEventId === nextProps.graphEventId
  )
);
