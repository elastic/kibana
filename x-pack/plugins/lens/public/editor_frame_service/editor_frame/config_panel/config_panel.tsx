/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, useCallback } from 'react';
import { EuiForm } from '@elastic/eui';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';

import { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import {
  changeIndexPattern,
  onDropToDimension,
  removeDimension,
} from '../../../state_management/lens_slice';
import { AddLayerFunction, DragDropOperation, Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps, LayerPanelProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
  cloneLayer,
  addLayer as addLayerAction,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
  registerLibraryAnnotationGroup,
} from '../../../state_management';
import { getRemoveOperation } from '../../../utils';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? props.visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <LayerPanels {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function LayerPanels(
  props: ConfigPanelWrapperProps & {
    activeVisualization: Visualization;
  }
) {
  const { activeVisualization, datasourceMap, indexPatternService } = props;
  const { activeDatasourceId, visualization, datasourceStates, query } = useLensSelector(
    (state) => state.lens
  );

  const dispatchLens = useLensDispatch();

  const layerIds = activeVisualization.getLayerIds(visualization.state);
  const {
    setNextFocusedId: setNextFocusedLayerId,
    removeRef: removeLayerRef,
    registerNewRef: registerNewLayerRef,
  } = useFocusUpdate(layerIds);

  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    },
    [activeVisualization.id, dispatchLens]
  );
  const updateDatasource = useMemo(
    () =>
      (datasourceId: string | undefined, newState: unknown, dontSyncLinkedDimensions?: boolean) => {
        if (datasourceId) {
          dispatchLens(
            updateDatasourceState({
              newDatasourceState:
                typeof newState === 'function'
                  ? newState(datasourceStates[datasourceId].state)
                  : newState,
              datasourceId,
              clearStagedPreview: false,
              dontSyncLinkedDimensions,
            })
          );
        }
      },
    [dispatchLens, datasourceStates]
  );
  const updateDatasourceAsync = useMemo(
    () => (datasourceId: string | undefined, newState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        updateDatasource(datasourceId, newState);
      });
    },
    [updateDatasource]
  );

  const updateAll = useMemo(
    () =>
      (
        datasourceId: string | undefined,
        newDatasourceState: unknown,
        newVisualizationState: unknown
      ) => {
        if (!datasourceId) return;
        // React will synchronously update if this is triggered from a third party component,
        // which we don't want. The timeout lets user interaction have priority, then React updates.

        setTimeout(() => {
          const newDsState =
            typeof newDatasourceState === 'function'
              ? newDatasourceState(datasourceStates[datasourceId].state)
              : newDatasourceState;

          const newVisState =
            typeof newVisualizationState === 'function'
              ? newVisualizationState(visualization.state)
              : newVisualizationState;

          dispatchLens(
            updateVisualizationState({
              visualizationId: activeVisualization.id,
              newState: newVisState,
              dontSyncLinkedDimensions: true, // TODO: to refactor: this is quite brittle, we avoid to sync linked dimensions because we do it with datasourceState update
            })
          );
          dispatchLens(
            updateDatasourceState({
              newDatasourceState: newDsState,
              datasourceId,
              clearStagedPreview: false,
            })
          );
        }, 0);
      },
    [dispatchLens, visualization.state, datasourceStates, activeVisualization.id]
  );

  const toggleFullscreen = useCallback(() => {
    dispatchLens(setToggleFullscreen());
  }, [dispatchLens]);

  const handleDimensionDrop = useCallback(
    (payload: { source: DragDropIdentifier; target: DragDropOperation; dropType: DropType }) => {
      dispatchLens(onDropToDimension(payload));
    },
    [dispatchLens]
  );

  const onRemoveLayer = useCallback(
    (layerToRemoveId: string) => {
      const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerToRemoveId];
      const datasourceId = datasourcePublicAPI?.datasourceId;

      if (datasourceId) {
        const layerDatasource = datasourceMap[datasourceId];
        const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
        const trigger = props.uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
        const action = props.uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

        action?.execute({
          trigger,
          fromDataView: layerDatasource.getUsedDataView(layerDatasourceState, layerToRemoveId),
          usedDataViews: layerDatasource
            .getLayers(layerDatasourceState)
            .map((layer) => layerDatasource.getUsedDataView(layerDatasourceState, layer)),
          defaultDataView: layerDatasource.getUsedDataView(layerDatasourceState),
        } as ActionExecutionContext);
      }

      dispatchLens(
        removeOrClearLayer({
          visualizationId: activeVisualization.id,
          layerId: layerToRemoveId,
          layerIds,
        })
      );

      removeLayerRef(layerToRemoveId);
    },
    [
      activeVisualization.id,
      datasourceMap,
      datasourceStates,
      dispatchLens,
      layerIds,
      props.framePublicAPI.datasourceLayers,
      props.uiActions,
      removeLayerRef,
    ]
  );

  const onChangeIndexPattern = useCallback(
    async ({
      indexPatternId,
      datasourceId,
      visualizationId,
      layerId,
    }: {
      indexPatternId: string;
      datasourceId?: string;
      visualizationId?: string;
      layerId?: string;
    }) => {
      const indexPatterns = await props.indexPatternService?.ensureIndexPattern({
        id: indexPatternId,
        cache: props.framePublicAPI.dataViews.indexPatterns,
      });
      if (indexPatterns) {
        dispatchLens(
          changeIndexPattern({
            indexPatternId,
            datasourceIds: datasourceId ? [datasourceId] : [],
            visualizationIds: visualizationId ? [visualizationId] : [],
            layerId,
            dataViews: { indexPatterns },
          })
        );
      }
    },
    [dispatchLens, props.framePublicAPI.dataViews.indexPatterns, props.indexPatternService]
  );

  const addLayer: AddLayerFunction = (layerType, extraArg, ignoreInitialValues, seriesType) => {
    const layerId = generateId();
    dispatchLens(addLayerAction({ layerId, layerType, extraArg, ignoreInitialValues, seriesType }));

    setNextFocusedLayerId(layerId);
  };

  const registerLibraryAnnotationGroupFunction = useCallback<
    LayerPanelProps['registerLibraryAnnotationGroup']
  >((groupInfo) => dispatchLens(registerLibraryAnnotationGroup(groupInfo)), [dispatchLens]);

  const hideAddLayerButton = query && isOfAggregateQueryType(query);

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId, layerIndex) => {
        const { hidden, groups } = activeVisualization.getConfiguration({
          layerId,
          frame: props.framePublicAPI,
          state: visualization.state,
        });

        return (
          !hidden && (
            <LayerPanel
              {...props}
              onDropToDimension={handleDimensionDrop}
              registerLibraryAnnotationGroup={registerLibraryAnnotationGroupFunction}
              dimensionGroups={groups}
              activeVisualization={activeVisualization}
              registerNewLayerRef={registerNewLayerRef}
              key={layerId}
              layerId={layerId}
              layerIndex={layerIndex}
              visualizationState={visualization.state}
              visualizationMap={props.visualizationMap}
              updateVisualization={setVisualizationState}
              updateDatasource={updateDatasource}
              updateDatasourceAsync={updateDatasourceAsync}
              displayLayerSettings={!props.hideLayerHeader}
              onlyAllowSwitchToSubtypes={props.onlyAllowSwitchToSubtypes}
              onChangeIndexPattern={(args) => {
                onChangeIndexPattern(args);
                const layersToRemove =
                  activeVisualization.getLayersToRemoveOnIndexPatternChange?.(
                    visualization.state
                  ) ?? [];
                layersToRemove.forEach((id) => onRemoveLayer(id));
              }}
              updateAll={updateAll}
              addLayer={addLayer}
              isOnlyLayer={
                getRemoveOperation(
                  activeVisualization,
                  visualization.state,
                  layerId,
                  layerIds.length
                ) === 'clear'
              }
              onEmptyDimensionAdd={(columnId, { groupId }) => {
                // avoid state update if the datasource does not support initializeDimension
                if (
                  activeDatasourceId != null &&
                  datasourceMap[activeDatasourceId]?.initializeDimension
                ) {
                  dispatchLens(
                    setLayerDefaultDimension({
                      layerId,
                      columnId,
                      groupId,
                    })
                  );
                }
              }}
              onCloneLayer={() => {
                dispatchLens(
                  cloneLayer({
                    layerId,
                  })
                );
              }}
              onRemoveLayer={onRemoveLayer}
              onRemoveDimension={(dimensionProps) => {
                const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerId];
                const datasourceId = datasourcePublicAPI?.datasourceId;
                dispatchLens(removeDimension({ ...dimensionProps, datasourceId }));
              }}
              toggleFullscreen={toggleFullscreen}
              indexPatternService={indexPatternService}
            />
          )
        );
      })}
      {!hideAddLayerButton &&
        activeVisualization?.getAddLayerButtonComponent?.({
          state: visualization.state,
          supportedLayers: activeVisualization.getSupportedLayers(
            visualization.state,
            props.framePublicAPI
          ),
          addLayer,
          ensureIndexPattern: async (specOrId) => {
            let indexPatternId;

            if (typeof specOrId === 'string') {
              indexPatternId = specOrId;
            } else {
              const dataView = await props.dataViews.create(specOrId);

              if (!dataView.id) {
                return;
              }

              indexPatternId = dataView.id;
            }

            const newIndexPatterns = await indexPatternService?.ensureIndexPattern({
              id: indexPatternId,
              cache: props.framePublicAPI.dataViews.indexPatterns,
            });

            if (newIndexPatterns) {
              dispatchLens(
                changeIndexPattern({
                  dataViews: { indexPatterns: newIndexPatterns },
                  datasourceIds: Object.keys(datasourceStates),
                  visualizationIds: visualization.activeId ? [visualization.activeId] : [],
                  indexPatternId,
                })
              );
            }
          },
          registerLibraryAnnotationGroup: registerLibraryAnnotationGroupFunction,
          isInlineEditing: Boolean(props?.setIsInlineFlyoutVisible),
        })}
    </EuiForm>
  );
}
