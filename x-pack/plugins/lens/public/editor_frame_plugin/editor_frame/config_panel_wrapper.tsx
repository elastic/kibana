/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import { Visualization, DatasourcePublicAPI } from '../../types';

interface ConfigPanelWrapperProps {
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  dispatch: (action: Action) => void;
  datasourcePublicAPI: DatasourcePublicAPI;
}

export function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState,
      });
    },
    [props.dispatch]
  );

  return (
    <>
      <EuiSelect
        data-test-subj="visualization-switch"
        options={Object.keys(props.visualizationMap).map(visualizationId => ({
          value: visualizationId,
          text: visualizationId,
        }))}
        value={props.activeVisualizationId || undefined}
        onChange={e => {
          props.dispatch({
            type: 'SWITCH_VISUALIZATION',
            newVisualizationId: e.target.value,
            // TODO we probably want to have a separate API to "force" a visualization switch
            // which isn't a result of a picked suggestion
            initialState: props.visualizationMap[e.target.value].initialize(
              undefined,
              props.datasourcePublicAPI
            ),
          });
        }}
      />
      {props.activeVisualizationId && props.visualizationState !== null && (
        <NativeRenderer
          render={props.visualizationMap[props.activeVisualizationId].renderConfigPanel}
          nativeProps={{
            state: props.visualizationState,
            setState: setVisualizationState,
            datasource: props.datasourcePublicAPI,
          }}
        />
      )}
    </>
  );
}
