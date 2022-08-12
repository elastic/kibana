/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { EuiForm } from '@elastic/eui';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { LayerType } from '../../../../common';
import { removeDimension } from '../../../state_management/lens_slice';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
  addLayer as addLayerAction,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
  syncLinkedDimensions,
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
  const { activeDatasourceId, visualization, datasourceStates } = useLensSelector(
    (state) => state.lens
  );

  const dispatchLens = useLensDispatch();

  const layerInfos = activeVisualization.getLayersInUse(visualization.state);
  const {
    setNextFocusedId: setNextFocusedLayerId,
    removeRef: removeLayerRef,
    registerNewRef: registerNewLayerRef,
  } = useFocusUpdate(layerInfos.map(({ id }) => id));

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
        dispatchLens(syncLinkedDimensions());
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

  const addLayer = (layerType: LayerType) => {
    const layerId = generateId();
    dispatchLens(addLayerAction({ layerId, layerType }));
    setNextFocusedLayerId(layerId);
  };

  return (
    <EuiForm className="lnsConfigPanel">
      {layerInfos.map(
        ({ id: layerId, hidden }, layerIndex) =>
          !hidden && (
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
              addLayer={(layerType) => addLayer(layerType)}
              isOnlyLayer={
                getRemoveOperation(
                  activeVisualization,
                  visualization.state,
                  layerId,
                  layerInfos.length
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
              onRemoveDimension={(dimensionProps) => {
                const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerId];
                const datasourceId = datasourcePublicAPI?.datasourceId;
                dispatchLens(removeDimension({ ...dimensionProps, datasourceId }));
              }}
              onRemoveLayer={(layerToRemove: string) => {
                const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerToRemove];
                const datasourceId = datasourcePublicAPI?.datasourceId;
                const layerDatasource = datasourceMap[datasourceId];
                const layerDatasourceState = datasourceStates?.[datasourceId]?.state;

                const trigger = props.uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
                const action = props.uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

                action?.execute({
                  trigger,
                  fromDataView: layerDatasource.getUsedDataView(
                    layerDatasourceState,
                    layerToRemove
                  ),
                  usedDataViews: layerDatasource
                    .getLayers(layerDatasourceState)
                    .map((layer) => layerDatasource.getUsedDataView(layerDatasourceState, layer)),
                  defaultDataView: layerDatasource.getCurrentIndexPatternId(layerDatasourceState),
                } as ActionExecutionContext);

                dispatchLens(
                  removeOrClearLayer({
                    visualizationId: activeVisualization.id,
                    layerId: layerToRemove,
                    layerIds: layerInfos.map(({ id }) => id),
                  })
                );
                removeLayerRef(layerToRemove);
              }}
              toggleFullscreen={toggleFullscreen}
            />
          )
      )}
      <AddLayerButton
        visualization={activeVisualization}
        visualizationState={visualization.state}
        layersMeta={props.framePublicAPI}
        onAddLayerClick={(layerType) => addLayer(layerType)}
      />
    </EuiForm>
  );
}
