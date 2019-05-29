/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Visualization, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

export interface XyVisualizationState {
  roles: string[];
}

export type XyVisualizationPersistedState = XyVisualizationState;

export const xyVisualization: Visualization<XyVisualizationState, XyVisualizationPersistedState> = {
  initialize() {
    return {
      roles: [],
    };
  },

  getPersistableState(state) {
    return state;
  },

  renderConfigPanel: (domElement, props) => {
    render(
      <div>
        XY Visualization
        <NativeRenderer
          nativeProps={{
            columnId: 'col1',
            filterOperations: (op: Operation) => true,
            suggestedOrder: 1,
          }}
          render={props.datasource.renderDimensionPanel}
        />
      </div>,
      domElement
    );
  },

  getSuggestions: options => [],

  toExpression: state => '',
};
