/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './config_panel.scss';

import React, { useMemo, memo } from 'react';
import { EuiForm } from '@elastic/eui';
import { mapValues } from 'lodash';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { appendLayer } from './layer_actions';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  useLensDispatch,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
  VisualizationState,
} from '../../../state_management';
import { AddLayerButton } from './add_layer';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const visualization = useLensSelector(selectVisualization);
  const activeVisualization = visualization.activeId
    ? props.visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <LayerPanels {...props} activeVisualization={activeVisualization} />
  ) : null;
});

function getRemoveOperation(
  activeVisualization: Visualization,
  visualizationState: VisualizationState['state'],
  layerId: string,
  layerCount: number
) {
  if (activeVisualization.getRemoveOperation) {
    return activeVisualization.getRemoveOperation(visualizationState, layerId);
  }
  // fallback to generic count check
  return layerCount === 1 ? 'clear' : 'remove';
}
export function LayerPanels(
  props: ConfigPanelWrapperProps & {
    activeVisualization: Visualization;
  }
) {
  const { activeVisualization, datasourceMap } = props;
  const { activeDatasourceId, visualization } = useLensSelector((state) => state.lens);

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
          updater: newState,
          clearStagedPreview: false,
        })
      );
    },
    [activeVisualization, dispatchLens]
  );
  const updateDatasource = useMemo(
    () => (datasourceId: string, newState: unknown) => {
      dispatchLens(
        updateDatasourceState({
          updater: (prevState: unknown) =>
            typeof newState === 'function' ? newState(prevState) : newState,
          datasourceId,
          clearStagedPreview: false,
        })
      );
    },
    [dispatchLens]
  );
  const updateDatasourceAsync = useMemo(
    () => (datasourceId: string, newState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        updateDatasource(datasourceId, newState);
      }, 0);
    },
    [updateDatasource]
  );
  const updateAll = useMemo(
    () => (datasourceId: string, newDatasourceState: unknown, newVisualizationState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        dispatchLens(
          updateState({
            subType: 'UPDATE_ALL_STATES',
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
                stagedPreview: undefined,
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

  const datasourcePublicAPIs = props.framePublicAPI.datasourceLayers;

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId, layerIndex) =>
        datasourcePublicAPIs[layerId] ? (
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
            updateAll={updateAll}
            isOnlyLayer={
              getRemoveOperation(
                activeVisualization,
                visualization.state,
                layerId,
                layerIds.length
              ) === 'clear'
            }
            onRemoveLayer={() => {
              dispatchLens(
                updateState({
                  subType: 'REMOVE_OR_CLEAR_LAYER',
                  updater: (state) => {
                    const isOnlyLayer =
                      getRemoveOperation(
                        activeVisualization,
                        state.visualization.state,
                        layerId,
                        layerIds.length
                      ) === 'clear';

                    return {
                      ...state,
                      datasourceStates: mapValues(
                        state.datasourceStates,
                        (datasourceState, datasourceId) => {
                          const datasource = datasourceMap[datasourceId!];
                          return {
                            ...datasourceState,
                            state: isOnlyLayer
                              ? datasource.clearLayer(datasourceState.state, layerId)
                              : datasource.removeLayer(datasourceState.state, layerId),
                          };
                        }
                      ),
                      visualization: {
                        ...state.visualization,
                        state:
                          isOnlyLayer || !activeVisualization.removeLayer
                            ? activeVisualization.clearLayer(state.visualization.state, layerId)
                            : activeVisualization.removeLayer(state.visualization.state, layerId),
                      },
                      stagedPreview: undefined,
                    };
                  },
                })
              );

              removeLayerRef(layerId);
            }}
            toggleFullscreen={toggleFullscreen}
          />
        ) : null
      )}
      <AddLayerButton
        visualization={activeVisualization}
        visualizationState={visualization.state}
        layersMeta={props.framePublicAPI}
        onAddLayerClick={(layerType) => {
          const id = generateId();
          dispatchLens(
            updateState({
              subType: 'ADD_LAYER',
              updater: (state) =>
                appendLayer({
                  activeVisualization,
                  generateId: () => id,
                  trackUiEvent,
                  activeDatasource: datasourceMap[activeDatasourceId!],
                  state,
                  layerType,
                }),
            })
          );

          setNextFocusedLayerId(id);
        }}
      />
    </EuiForm>
  );
}
