/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './config_panel.scss';

import React, { useMemo, memo } from 'react';
import { EuiFlexItem, EuiToolTip, EuiButton, EuiForm } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { removeLayer, appendLayer } from './layer_actions';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const activeVisualization = props.visualizationMap[props.activeVisualizationId || ''];
  const { visualizationState } = props;

  return activeVisualization && visualizationState ? (
    <LayerPanels {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function LayerPanels(
  props: ConfigPanelWrapperProps & {
    activeDatasourceId: string;
    activeVisualization: Visualization;
  }
) {
  const {
    activeVisualization,
    visualizationState,
    dispatch,
    activeDatasourceId,
    datasourceMap,
  } = props;

  const layerIds = activeVisualization.getLayerIds(visualizationState);
  const {
    setNextFocusedId: setNextFocusedLayerId,
    removeRef: removeLayerRef,
    registerNewRef: registerNewLayerRef,
  } = useFocusUpdate(layerIds);

  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        visualizationId: activeVisualization.id,
        updater: newState,
        clearStagedPreview: false,
      });
    },
    [dispatch, activeVisualization]
  );
  const updateDatasource = useMemo(
    () => (datasourceId: string, newState: unknown) => {
      dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        updater: (prevState: unknown) =>
          typeof newState === 'function' ? newState(prevState) : newState,
        datasourceId,
        clearStagedPreview: false,
      });
    },
    [dispatch]
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
        dispatch({
          type: 'UPDATE_STATE',
          subType: 'UPDATE_ALL_STATES',
          updater: (prevState) => {
            const updatedDatasourceState =
              typeof newDatasourceState === 'function'
                ? newDatasourceState(prevState.datasourceStates[datasourceId].state)
                : newDatasourceState;
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
                state: newVisualizationState,
              },
              stagedPreview: undefined,
            };
          },
        });
      }, 0);
    },
    [dispatch]
  );
  const toggleFullscreen = useMemo(
    () => () => {
      dispatch({
        type: 'TOGGLE_FULLSCREEN',
      });
    },
    [dispatch]
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
            visualizationState={visualizationState}
            updateVisualization={setVisualizationState}
            updateDatasource={updateDatasource}
            updateDatasourceAsync={updateDatasourceAsync}
            updateAll={updateAll}
            isOnlyLayer={layerIds.length === 1}
            onRemoveLayer={() => {
              dispatch({
                type: 'UPDATE_STATE',
                subType: 'REMOVE_OR_CLEAR_LAYER',
                updater: (state) =>
                  removeLayer({
                    activeVisualization,
                    layerId,
                    trackUiEvent,
                    datasourceMap,
                    state,
                  }),
              });
              removeLayerRef(layerId);
            }}
            toggleFullscreen={toggleFullscreen}
          />
        ) : null
      )}
      {activeVisualization.appendLayer && visualizationState && (
        <EuiFlexItem grow={true} className="lnsConfigPanel__addLayerBtnWrapper">
          <EuiToolTip
            className="eui-fullWidth"
            title={i18n.translate('xpack.lens.xyChart.addLayer', {
              defaultMessage: 'Add a layer',
            })}
            content={i18n.translate('xpack.lens.xyChart.addLayerTooltip', {
              defaultMessage:
                'Use multiple layers to combine chart types or visualize different index patterns.',
            })}
            position="bottom"
          >
            <EuiButton
              className="lnsConfigPanel__addLayerBtn"
              fullWidth
              size="s"
              data-test-subj="lnsLayerAddButton"
              aria-label={i18n.translate('xpack.lens.xyChart.addLayerButton', {
                defaultMessage: 'Add layer',
              })}
              fill
              color="text"
              onClick={() => {
                const id = generateId();
                dispatch({
                  type: 'UPDATE_STATE',
                  subType: 'ADD_LAYER',
                  updater: (state) =>
                    appendLayer({
                      activeVisualization,
                      generateId: () => id,
                      trackUiEvent,
                      activeDatasource: datasourceMap[activeDatasourceId],
                      state,
                    }),
                });
                setNextFocusedLayerId(id);
              }}
              iconType="plusInCircleFilled"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiForm>
  );
}
