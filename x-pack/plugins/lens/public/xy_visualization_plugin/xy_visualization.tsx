/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { Visualization, Operation } from '../types';
import { getSuggestions } from './xy_suggestions';
import { XYArgs } from './xy_expression';
import { NativeRenderer } from '../native_renderer';

export type State = XYArgs;
export type PersistableState = XYArgs;

export const xyVisualization: Visualization<State, PersistableState> = {
  getSuggestions,

  initialize(state) {
    return (
      state || {
        title: 'Empty line chart',
        legend: { isVisible: true, position: Position.Right },
        seriesType: 'line',
        splitSeriesAccessors: [],
        stackAccessors: [],
        x: {
          accessor: '',
          position: Position.Bottom,
          showGridlines: false,
          title: 'Uknown',
        },
        y: {
          accessors: [],
          position: Position.Left,
          showGridlines: false,
          title: 'Uknown',
        },
      }
    );
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
        <NativeRenderer
          nativeProps={{
            columnId: 'col2',
            filterOperations: (op: Operation) => true,
            suggestedOrder: 2,
          }}
          render={props.datasource.renderDimensionPanel}
        />
      </div>,
      domElement
    );
  },

  toExpression: state => ({
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_xy_chart',
        arguments: {
          seriesType: [state.seriesType],
          title: [state.title],
          legend: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_xy_legendConfig',
                  arguments: {
                    isVisible: [state.legend.isVisible],
                    position: [state.legend.position],
                  },
                },
              ],
            },
          ],
          x: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_xy_xConfig',
                  arguments: {
                    title: [state.x.title],
                    showGridlines: [state.x.showGridlines],
                    position: [state.x.position],
                    accessor: [state.x.accessor],
                  },
                },
              ],
            },
          ],
          y: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_xy_yConfig',
                  arguments: {
                    title: [state.y.title],
                    showGridlines: [state.y.showGridlines],
                    position: [state.y.position],
                    accessors: state.y.accessors,
                  },
                },
              ],
            },
          ],
          splitSeriesAccessors: state.splitSeriesAccessors,
          stackAccessors: state.stackAccessors,
        },
      },
    ],
  }),
};
