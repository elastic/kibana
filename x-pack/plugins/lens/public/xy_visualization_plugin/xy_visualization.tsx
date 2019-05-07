/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Visualization, DimensionRole } from '../types';

export interface XyVisualizationState {
  roles: DimensionRole[];
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
    render(<div>XY Visualization</div>, domElement);
  },

  getSuggestions: options => [],

  getMappingOfTableToRoles: (state, datasource) => [],

  toExpression: state => '',
};
