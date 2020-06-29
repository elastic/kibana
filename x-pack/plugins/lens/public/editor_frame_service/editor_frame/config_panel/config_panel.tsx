/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, memo } from 'react';
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

  return (
    activeVisualization &&
    visualizationState && <LayerPanels {...props} activeVisualization={activeVisualization} />
  );
});

function LayerPanels(
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
  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        visualizationId: activeVisualization.id,
        newState,
        clearStagedPreview: false,
      });
    },
    [props.dispatch, activeVisualization]
  );
  const updateDatasource = useMemo(
    () => (datasourceId: string, newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        updater: () => newState,
        datasourceId,
        clearStagedPreview: false,
      });
    },
    [props.dispatch]
  );
  const updateAll = useMemo(
    () => (datasourceId: string, newDatasourceState: unknown, newVisualizationState: unknown) => {
      props.dispatch({
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
    [props.dispatch]
  );
  const layerIds = activeVisualization.getLayerIds(visualizationState);

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId) => (
        <LayerPanel
          {...props}
          key={layerId}
          layerId={layerId}
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
          }}
        />
      ))}
      {activeVisualization.appendLayer && visualizationState && (
        <EuiFlexItem grow={true}>
          <EuiToolTip
            className="eui-fullWidth"
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
              data-test-subj="lnsXY_layer_add"
              aria-label={i18n.translate('xpack.lens.xyChart.addLayerButton', {
                defaultMessage: 'Add layer',
              })}
              title={i18n.translate('xpack.lens.xyChart.addLayerButton', {
                defaultMessage: 'Add layer',
              })}
              onClick={() => {
                dispatch({
                  type: 'UPDATE_STATE',
                  subType: 'ADD_LAYER',
                  updater: (state) =>
                    appendLayer({
                      activeVisualization,
                      generateId,
                      trackUiEvent,
                      activeDatasource: datasourceMap[activeDatasourceId],
                      state,
                    }),
                });
              }}
              iconType="plusInCircleFilled"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiForm>
  );
}
