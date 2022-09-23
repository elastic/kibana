/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, useCallback } from 'react';
import { EuiForm } from '@elastic/eui';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { changeIndexPattern } from '../../../state_management/lens_slice';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
  cloneLayer,
  addLayer,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
} from '../../../state_management';
import { AddLayerButton } from './add_layer';
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
  const { activeDatasourceId, visualization, datasourceStates } = useLensSelector(
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
    [activeVisualization, dispatchLens]
  );
  const updateDatasource = useMemo(
    () => (datasourceId: string | undefined, newState: unknown) => {
      if (datasourceId) {
        dispatchLens(
          updateDatasourceState({
            updater: (prevState: unknown) =>
              typeof newState === 'function' ? newState(prevState) : newState,
            datasourceId,
            clearStagedPreview: false,
          })
        );
      }
    },
    [dispatchLens]
  );
  const updateDatasourceAsync = useMemo(
    () => (datasourceId: string | undefined, newState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        updateDatasource(datasourceId, newState);
      }, 0);
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
          dispatchLens(
            updateState({
              updater: (prevState) => {
                const updatedDatasourceState =
                  typeof newDatasourceState === 'function'
                    ? newDatasourceState(prevState.datasourceStates[datasourceId].state)
                    : newDatasourceState;

                const updatedVisualizationState =
                  typeof newVisualizationState === 'function'
                    ? newVisualizationState(prevState.visualization.state)
                    : newVisualizationState;

                return {
                  ...prevState,
                  datasourceStates: {
                    ...prevState.datasourceStates,
                    [datasourceId]: {
                      state: updatedDatasourceState,
                      isLoading: false,
                    },
                  },
                  visualization: {
                    ...prevState.visualization,
                    state: updatedVisualizationState,
                  },
                };
              },
            })
          );
        }, 0);
      },
    [dispatchLens]
  );

  const toggleFullscreen = useMemo(
    () => () => {
      dispatchLens(setToggleFullscreen());
    },
    [dispatchLens]
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
      const indexPatterns = await props.indexPatternService.ensureIndexPattern({
        id: indexPatternId,
        cache: props.framePublicAPI.dataViews.indexPatterns,
      });
      dispatchLens(
        changeIndexPattern({
          indexPatternId,
          datasourceIds: datasourceId ? [datasourceId] : [],
          visualizationIds: visualizationId ? [visualizationId] : [],
          layerId,
          dataViews: { indexPatterns },
        })
      );
    },
    [dispatchLens, props.framePublicAPI.dataViews, props.indexPatternService]
  );

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId, layerIndex) => (
        <LayerPanel
          {...props}
          activeVisualization={activeVisualization}
          registerNewLayerRef={registerNewLayerRef}
          key={layerId}
          layerId={layerId}
          layerIndex={layerIndex}
          visualizationState={visualization.state}
          updateVisualization={setVisualizationState}
          updateDatasource={updateDatasource}
          updateDatasourceAsync={updateDatasourceAsync}
          onChangeIndexPattern={onChangeIndexPattern}
          updateAll={updateAll}
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
          onRemoveLayer={() => {
            const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerId];
            const datasourceId = datasourcePublicAPI?.datasourceId;

            if (datasourceId) {
              const layerDatasource = datasourceMap[datasourceId];
              const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
              const trigger = props.uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
              const action = props.uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

              action?.execute({
                trigger,
                fromDataView: layerDatasource.getUsedDataView(layerDatasourceState, layerId),
                usedDataViews: layerDatasource
                  .getLayers(layerDatasourceState)
                  .map((layer) => layerDatasource.getUsedDataView(layerDatasourceState, layer)),
                defaultDataView: layerDatasource.getCurrentIndexPatternId(layerDatasourceState),
              } as ActionExecutionContext);
            }

            dispatchLens(
              removeOrClearLayer({
                visualizationId: activeVisualization.id,
                layerId,
                layerIds,
              })
            );
            removeLayerRef(layerId);
          }}
          toggleFullscreen={toggleFullscreen}
          indexPatternService={indexPatternService}
        />
      ))}
      <AddLayerButton
        visualization={activeVisualization}
        visualizationState={visualization.state}
        layersMeta={props.framePublicAPI}
        onAddLayerClick={(layerType) => {
          const layerId = generateId();
          dispatchLens(addLayer({ layerId, layerType }));
          setNextFocusedLayerId(layerId);
        }}
      />
    </EuiForm>
  );
}
