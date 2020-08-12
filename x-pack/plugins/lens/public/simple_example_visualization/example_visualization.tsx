/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/target/common';
import { getSuggestions } from './example_suggestions';
import { Visualization, FramePublicAPI, OperationMetadata } from '../types';
import { State, PersistableState } from './types';
import chartMetricSVG from '../assets/chart_metric.svg';

/**
 * This takes the configured state, the FramePublicAPI, and the mode and returns
 * an expression which will render the metric visualization. (Kind of more boiler
 * plate)
 *
 * @param state - the metric visualization's internal state
 * @param frame - the Lens editor frame API, which currently is essentially a layer-management
 *   API used to add / remove / access layer information.
 * @param mode - full or reduced, if full, render normally, if reduced, render as a thumbnail
 */
const toExpression = (
  state: State,
  frame: FramePublicAPI,
  mode: 'reduced' | 'full' = 'full'
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  const [datasource] = Object.values(frame.datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_example_chart',
        arguments: {
          title: [(operation && operation.label) || ''],
          accessor: [state.accessor],
          mode: [mode],
        },
      },
    ],
  };
};

/**
 * This is the meat of the visualization. It's the actual plugin signature.
 * This is where all of the previous functions and definitions come together
 * in a shape that Lens understands.
 */
export const exampleVisualization: Visualization<State, PersistableState> = {
  // Uniquely identifies this plugin (must be unique across all Lens plugins)
  id: 'lnsExample',

  // The list of sub-visualizations that this plugin exposes. In most
  // cases, this will only have one entry, but the XY visualization
  // supports numerous sub types, pie chart have two.
  // This is what the chart switcher for XY UI uses.
  visualizationTypes: [
    {
      id: 'lnsExample',
      icon: 'visMetric', // this icon comes from eui
      largeIcon: chartMetricSVG,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Example',
      }),
    },
  ],

  getVisualizationTypeId() {
    return 'lnsExample';
  },
  // Clears the specified layer (the second parameter is the layerId, but
  // we ignore it, since we only have one layer).
  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
    };
  },

  // Given our state, return the list of layers we support
  getLayerIds(state) {
    return [state.layerId];
  },

  // Gets a human-friendly description of the visualization
  getDescription() {
    return {
      icon: chartMetricSVG,
      label: i18n.translate('xpack.lens.exampleVis.label', {
        defaultMessage: 'Example Vis',
      }),
    };
  },

  // See previous comment on this function
  getSuggestions,

  // Initializes the visualization. If state is defined, we are
  // initializing from a saved state. If it is not defined, we
  // are initializing a new state.
  initialize(frame, state) {
    return (
      state || {
        // This is hacky. If you dig into what addNewLayer is doing,
        // you'll see that it is effectful, and ultimately ends up
        // modifying the datasource state, causing a React re-render.
        // This is really not an ideal thing to do in an init function.
        // I think we can and should rethink how initialization works so
        // that it can be done in a non-effectful way.
        layerId: frame.addNewLayer(),
        accessor: undefined,
      }
    );
  },

  getPersistableState: (state) => state,

  // visualization config for layer panel
  getConfiguration(props) {
    return {
      groups: [
        {
          groupId: 'example',
          groupLabel: i18n.translate('xpack.lens.example.label', { defaultMessage: 'Example' }),
          layerId: props.state.layerId,
          accessors: props.state.accessor ? [props.state.accessor] : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
        },
      ],
    };
  },

  // see in the function definition
  toExpression,
  // used for suggestions previews
  toPreviewExpression: (state: State, frame: FramePublicAPI) =>
    toExpression(state, frame, 'reduced'),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined };
  },
};
