/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { EuiForm } from '@elastic/eui';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
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
          newState,
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
          onRemoveLayer={() => {
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
        />
      ))}
      <AddLayerButton
        visualization={activeVisualization}
        visualizationState={visualization.state}
        layersMeta={props.framePublicAPI}
        onAddLayerClick={(layerType, noDatasource) => {
          const layerId = generateId();
          dispatchLens(addLayer({ layerId, layerType, noDatasource }));
          trackUiEvent('layer_added');
          setNextFocusedLayerId(layerId);
        }}
      />
    </EuiForm>
  );
}
