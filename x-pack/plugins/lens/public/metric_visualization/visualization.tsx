/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/common';
import { getSuggestions } from './metric_suggestions';
import { LensIconChartMetric } from '../assets/chart_metric';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import type { MetricState } from '../../common/expressions';
import { layerTypes } from '../../common';

const toExpression = (
  state: MetricState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  attributes?: { mode?: 'reduced' | 'full'; title?: string; description?: string }
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
          title: [attributes?.title || ''],
          description: [attributes?.description || ''],
          metricTitle: [(operation && operation.label) || ''],
          accessor: [state.accessor],
          mode: [attributes?.mode || 'full'],
        },
      },
    ],
  };
};

export const metricVisualization: Visualization<MetricState> = {
  id: 'lnsMetric',

  visualizationTypes: [
    {
      id: 'lnsMetric',
      icon: LensIconChartMetric,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
      groupLabel: i18n.translate('xpack.lens.metric.groupLabel', {
        defaultMessage: 'Tabular and single value',
      }),
      sortPriority: 1,
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
      icon: LensIconChartMetric,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    };
  },

  getSuggestions,

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        accessor: undefined,
        layerType: layerTypes.DATA,
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
          accessors: props.state.accessor ? [{ columnId: props.state.accessor }] : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.metric.addLayer', {
          defaultMessage: 'Add visualization layer',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression,
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(state, datasourceLayers, { mode: 'reduced' }),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined };
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },
};
