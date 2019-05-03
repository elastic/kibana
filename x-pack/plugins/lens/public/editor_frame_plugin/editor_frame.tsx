/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { Datasource, Visualization, DatasourcePublicAPI } from '../types';

interface EditorFrameProps {
  datasources: { [key: string]: Datasource };
  visualizations: { [key: string]: Visualization };

  activeDatasource: string | null;
}

interface DatasourceState {
  [key: string]: {
    state: any;
    setState: (state: any) => void;
    api: DatasourcePublicAPI;
    datasource: Datasource;
  };
}

interface VisualizationState {
  [key: string]: {
    state: any;
    setState: (state: any) => void;
    visualization: Visualization;
  };
}

export function EditorFrame(props: EditorFrameProps) {
  const dsKeys = Object.keys(props.datasources);
  const vKeys = Object.keys(props.visualizations);

  const [datasourceState, setDatasourceState] = useState({} as DatasourceState);
  const [visualizationState, setVisualizationState] = useState({} as VisualizationState);

  // Initialize all datasources and load their public APIs
  useEffect(
    () => {
      Promise.all(
        dsKeys.map(key => {
          return props.datasources[key].initialize();
        })
      ).then(allStates => {
        const newState: { [key: string]: any } = {};
        allStates.forEach((state, index) => {
          const key = dsKeys[index];
          const datasource = props.datasources[key];

          const setState = (s: any) => {
            setDatasourceState({
              ...datasourceState,
              [key]: s,
            });
          };
          newState[key] = {
            datasource,
            api: datasource.getPublicAPI(state, setState),
            state,
            setState,
          };
        });
        setDatasourceState(newState);
      });
    },
    [dsKeys.length]
  );

  // Initialize all visualizations
  useEffect(
    () => {
      Promise.all(
        vKeys.map(key => {
          return props.visualizations[key].initialize();
        })
      ).then(allStates => {
        const newState: { [key: string]: any } = {};
        allStates.forEach((state, index) => {
          const key = vKeys[index];
          const visualization = props.visualizations[key];

          const setState = (s: any) => {
            setVisualizationState({
              ...visualizationState,
              [key]: s,
            });
          };
          newState[key] = {
            visualization,
            state,
            setState,
          };
        });
        setVisualizationState(newState);
      });
    },
    [vKeys.length]
  );

  return (
    <div>
      <h2>Editor Frame</h2>

      {Object.keys(datasourceState).length &&
        dsKeys.map(key => (
          <div
            key={key}
            ref={domElement => {
              if (domElement) {
                datasourceState[key].datasource.renderDataPanel(domElement, {
                  state: datasourceState[key].state,
                  setState: datasourceState[key].setState,
                });
              }
            }}
          />
        ))}

      {Object.keys(datasourceState).length &&
        Object.keys(visualizationState).length &&
        props.activeDatasource &&
        vKeys.map(key => (
          <div
            key={key}
            ref={domElement => {
              if (domElement) {
                props.visualizations[key].renderConfigPanel(domElement, {
                  datasource: datasourceState[props.activeDatasource!].api,
                  state: visualizationState[key].state,
                  setState: visualizationState[key].setState,
                });
              }
            }}
          />
        ))}
    </div>
  );
}
