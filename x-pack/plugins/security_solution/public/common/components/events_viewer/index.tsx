/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import {
  ControlColumnProps,
  RowRenderer,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { APP_ID, APP_UI_ID } from '../../../../common/constants';
import { timelineActions } from '../../../timelines/store/timeline';
import type { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { eventsViewerSelector } from './selectors';
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
import { useLoadDetailPanel } from '../../../timelines/components/side_panel/hooks/use_load_detail_panel';

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
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
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
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
  utilityBar,
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
      sessionViewId,
      showCheckboxes,
      sort,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, id));

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

  const { openDetailsPanel, FlyoutDetailsPanel } = useLoadDetailPanel({
    isFlyoutView: true,
    entityType,
    sourcerScope: SourcererScopeName.timeline,
    timelineId: id,
    tabType: TimelineTabs.query,
  });

  // TODO: DELETE!
  const handleOpenTimeline = useCallback(() => {
    openDetailsPanel('f0a40aefee00b545fe13c9b503cc0f1daf6601fafc3a3f0459fab321fd73afa7', () =>
      console.log('HELLO!')
    );
  }, [openDetailsPanel]);

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewId !== null;
    return shouldShowOverlay ? <GraphOverlay timelineId={id} /> : null;
  }, [graphEventId, id, sessionViewId]);
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
      refetchQuery(globalQueries);
    }
  }, [id, timelineQuery, globalQueries]);
  const bulkActions = useMemo(() => ({ onAlertStatusActionSuccess }), [onAlertStatusActionSuccess]);

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: scopeId,
    timelineId: id,
    editorActionsRef,
  });

  const casesPermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();
  const isLive = input.policy.kind === 'interval';

  return (
    <>
      <CasesContext owner={[APP_ID]} userCanCrud={casesPermissions?.crud ?? false}>
        <FullScreenContainer $isFullScreen={globalFullScreen}>
          {/* TODO: Delete! */}
          <button onClick={handleOpenTimeline} type="button">
            {'Open Flyout'}
          </button>
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
        {FlyoutDetailsPanel}
      </CasesContext>
    </>
  );
};

export const StatefulEventsViewer = React.memo(StatefulEventsViewerComponent);
