/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './config_panel.scss';

import React, { useMemo, memo, useEffect, useState, useCallback } from 'react';
import { EuiFlexItem, EuiToolTip, EuiButton, EuiForm } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { removeLayer, appendLayer } from './layer_actions';
import { ConfigPanelWrapperProps } from './types';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const activeVisualization = props.visualizationMap[props.activeVisualizationId || ''];
  const { visualizationState } = props;

  return activeVisualization && visualizationState ? (
    <LayerPanels {...props} activeVisualization={activeVisualization} />
  ) : null;
});

function useFocusUpdate(layerIds: string[]) {
  const [nextFocusedLayerId, setNextFocusedLayerId] = useState<string | null>(null);
  const [layerRefs, setLayersRefs] = useState<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const focusable = nextFocusedLayerId && layerRefs[nextFocusedLayerId];
    if (focusable) {
      focusable.focus();
      setNextFocusedLayerId(null);
    }
  }, [layerIds, layerRefs, nextFocusedLayerId]);

  const setLayerRef = useCallback((layerId, el) => {
    if (el) {
      setLayersRefs((refs) => ({
        ...refs,
        [layerId]: el,
      }));
    }
  }, []);

  const removeLayerRef = useCallback(
    (layerId) => {
      if (layerIds.length <= 1) {
        return setNextFocusedLayerId(layerId);
      }

      const removedLayerIndex = layerIds.findIndex((l) => l === layerId);
      const nextFocusedLayerIdId =
        removedLayerIndex === 0 ? layerIds[1] : layerIds[removedLayerIndex - 1];

      setLayersRefs((refs) => {
        const newLayerRefs = { ...refs };
        delete newLayerRefs[layerId];
        return newLayerRefs;
      });
      return setNextFocusedLayerId(nextFocusedLayerIdId);
    },
    [layerIds]
  );

  return { setNextFocusedLayerId, removeLayerRef, setLayerRef };
}

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
  const { setNextFocusedLayerId, removeLayerRef, setLayerRef } = useFocusUpdate(layerIds);

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
        updater: () => newState,
        datasourceId,
        clearStagedPreview: false,
      });
    },
    [dispatch]
  );
  const updateAll = useMemo(
    () => (datasourceId: string, newDatasourceState: unknown, newVisualizationState: unknown) => {
      dispatch({
        type: 'UPDATE_STATE',
        subType: 'UPDATE_ALL_STATES',
        updater: (prevState) => {
          return {
            ...prevState,
            datasourceStates: {
              ...prevState.datasourceStates,
              [datasourceId]: {
                state: newDatasourceState,
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
            setLayerRef={setLayerRef}
            key={layerId}
            layerId={layerId}
            layerIndex={layerIndex}
            visualizationState={visualizationState}
            updateVisualization={setVisualizationState}
            updateDatasource={updateDatasource}
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
          />
        ) : null
      )}
      {activeVisualization.appendLayer && visualizationState && (
        <EuiFlexItem grow={true}>
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
