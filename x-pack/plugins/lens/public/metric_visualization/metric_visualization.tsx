/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/target/common';
import { getSuggestions } from './metric_suggestions';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import { State } from './types';
import chartMetricSVG from '../assets/chart_metric.svg';

const toExpression = (
  state: State,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  mode: 'reduced' | 'full' = 'full'
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  const [datasource] = Object.values(datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_metric_chart',
        arguments: {
          title: [(operation && operation.label) || ''],
          accessor: [state.accessor],
          mode: [mode],
        },
      },
    ],
  };
};

export const metricVisualization: Visualization<State> = {
  id: 'lnsMetric',

  visualizationTypes: [
    {
      id: 'lnsMetric',
      icon: 'visMetric',
      largeIcon: chartMetricSVG,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    },
  ],

  getVisualizationTypeId() {
    return 'lnsMetric';
  },

  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: chartMetricSVG,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    };
  },

  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        layerId: frame.addNewLayer(),
        accessor: undefined,
      }
    );
  },

  getConfiguration(props) {
    return {
      groups: [
        {
          groupId: 'metric',
          groupLabel: i18n.translate('xpack.lens.metric.label', { defaultMessage: 'Metric' }),
          layerId: props.state.layerId,
          accessors: props.state.accessor ? [props.state.accessor] : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
        },
      ],
    };
  },

  toExpression,
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(state, datasourceLayers, 'reduced'),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined };
  },
};
