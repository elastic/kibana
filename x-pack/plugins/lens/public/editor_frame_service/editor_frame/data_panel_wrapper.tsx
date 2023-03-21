/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './data_panel_wrapper.scss';

import React, { useMemo, memo, useContext, useEffect, useCallback } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Easteregg } from './easteregg';
import { NativeRenderer } from '../../native_renderer';
import { DragContext, DragDropIdentifier } from '../../drag_drop';
import {
  StateSetter,
  DatasourceDataPanelProps,
  DatasourceMap,
  FramePublicAPI,
  VisualizationMap,
} from '../../types';
import {
  useLensDispatch,
  updateDatasourceState,
  useLensSelector,
  setState,
  applyChanges,
  selectExecutionContext,
  selectActiveDatasourceId,
  selectDatasourceStates,
  selectVisualizationState,
} from '../../state_management';
import { initializeSources } from './state_helpers';
import type { IndexPatternServiceAPI } from '../../data_views_service/service';
import { changeIndexPattern } from '../../state_management/lens_slice';
import { getInitialDataViewsObject } from '../../utils';

interface DataPanelWrapperProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  showNoDataPopover: () => void;
  core: DatasourceDataPanelProps['core'];
  dropOntoWorkspace: (field: DragDropIdentifier) => void;
  hasSuggestionForField: (field: DragDropIdentifier) => boolean;
  plugins: { uiActions: UiActionsStart; dataViews: DataViewsPublicPluginStart };
  indexPatternService: IndexPatternServiceAPI;
  frame: FramePublicAPI;
}

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const externalContext = useLensSelector(selectExecutionContext);
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const visualizationState = useLensSelector(selectVisualizationState);

  const datasourceIsLoading = activeDatasourceId
    ? datasourceStates[activeDatasourceId].isLoading
    : true;

  const dispatchLens = useLensDispatch();
  const setDatasourceState: StateSetter<unknown, { applyImmediately?: boolean }> = useMemo(() => {
    return (updater: unknown | ((prevState: unknown) => unknown), options) => {
      dispatchLens(
        updateDatasourceState({
          updater,
          datasourceId: activeDatasourceId!,
          clearStagedPreview: true,
        })
      );
      if (options?.applyImmediately) {
        dispatchLens(applyChanges());
      }
    };
  }, [activeDatasourceId, dispatchLens]);

  useEffect(() => {
    if (activeDatasourceId && datasourceStates[activeDatasourceId].state === null) {
      initializeSources(
        {
          datasourceMap: props.datasourceMap,
          visualizationMap: props.visualizationMap,
          visualizationState,
          datasourceStates,
          dataViews: props.plugins.dataViews,
          references: undefined,
          initialContext: undefined,
          storage: new Storage(localStorage),
          defaultIndexPatternId: props.core.uiSettings.get('defaultIndex'),
        },
        {
          isFullEditor: true,
        }
      ).then(
        ({
          datasourceStates: newDatasourceStates,
          visualizationState: newVizState,
          indexPatterns,
          indexPatternRefs,
        }) => {
          dispatchLens(
            setState({
              visualization: { ...visualizationState, state: newVizState },
              datasourceStates: Object.entries(newDatasourceStates).reduce(
                (state, [datasourceId, datasourceState]) => ({
                  ...state,
                  [datasourceId]: {
                    ...datasourceState,
                    isLoading: false,
                  },
                }),
                {}
              ),
              dataViews: getInitialDataViewsObject(indexPatterns, indexPatternRefs),
            })
          );
        }
      );
    }
  }, [
    datasourceStates,
    visualizationState,
    activeDatasourceId,
    props.datasourceMap,
    props.visualizationMap,
    dispatchLens,
    props.plugins.dataViews,
    props.core.uiSettings,
  ]);

  const onChangeIndexPattern = useCallback(
    async (indexPatternId: string, datasourceId: string, layerId?: string) => {
      // reload the indexpattern
      const indexPatterns = await props.indexPatternService.ensureIndexPattern({
        id: indexPatternId,
        cache: props.frame.dataViews.indexPatterns,
      });
      // now update the state
      dispatchLens(
        changeIndexPattern({
          dataViews: { indexPatterns },
          datasourceIds: [datasourceId],
          indexPatternId,
          layerId,
        })
      );
    },
    [props.indexPatternService, props.frame.dataViews.indexPatterns, dispatchLens]
  );

  const datasourceProps: DatasourceDataPanelProps = {
    ...externalContext,
    dragDropContext: useContext(DragContext),
    state: activeDatasourceId ? datasourceStates[activeDatasourceId].state : null,
    setState: setDatasourceState,
    core: props.core,
    showNoDataPopover: props.showNoDataPopover,
    dropOntoWorkspace: props.dropOntoWorkspace,
    hasSuggestionForField: props.hasSuggestionForField,
    uiActions: props.plugins.uiActions,
    onChangeIndexPattern,
    indexPatternService: props.indexPatternService,
    frame: props.frame,
    // Visualization can handle dataViews, so need to pass to the data panel the full list of used dataViews
    usedIndexPatterns: [
      ...((activeDatasourceId &&
        props.datasourceMap[activeDatasourceId]?.getUsedDataViews(
          datasourceStates[activeDatasourceId].state
        )) ||
        []),
      ...((visualizationState.activeId &&
        props.visualizationMap[visualizationState.activeId]?.getUsedDataViews?.(
          visualizationState.state
        )) ||
        []),
    ],
  };

  return (
    <>
      <Easteregg query={externalContext?.query} />
      {activeDatasourceId && !datasourceIsLoading && (
        <NativeRenderer
          className="lnsDataPanelWrapper"
          render={props.datasourceMap[activeDatasourceId].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
