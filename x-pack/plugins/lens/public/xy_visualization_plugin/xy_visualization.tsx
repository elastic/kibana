/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import uuid from 'uuid';
import { I18nProvider } from '@kbn/i18n/react';
import { getSuggestions } from './xy_suggestions';
import { XYConfigPanel } from './xy_config_panel';
import { Visualization } from '../types';
import { State, PersistableState } from './types';

export const xyVisualization: Visualization<State, PersistableState> = {
  getSuggestions,

  initialize(state) {
    return (
      state || {
        seriesType: 'line',
        title: 'Empty XY Chart',
        legend: { isVisible: true, position: Position.Right },
        x: {
          accessor: uuid.v4(),
          position: Position.Bottom,
          showGridlines: false,
          title: 'X',
        },
        y: {
          accessors: [uuid.v4()],
          position: Position.Left,
          showGridlines: false,
          title: 'Y',
        },
        splitSeriesAccessors: [],
        stackAccessors: [],
      }
    );
  },

  getPersistableState: state => state,

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <XYConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

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
