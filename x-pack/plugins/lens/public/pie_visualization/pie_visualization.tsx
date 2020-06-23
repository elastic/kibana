/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { Visualization, OperationMetadata } from '../types';
import { toExpression, toPreviewExpression } from './to_expression';
import { LayerState, PieVisualizationState } from './types';
import { suggestions } from './suggestions';
import { CHART_NAMES, MAX_PIE_BUCKETS, MAX_TREEMAP_BUCKETS } from './constants';
import { SettingsWidget } from './settings_widget';

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    groups: [],
    metric: undefined,
    numberDisplay: 'percent',
    categoryDisplay: 'default',
    legendDisplay: 'default',
    nestedLegend: false,
  };
}

const bucketedOperations = (op: OperationMetadata) => op.isBucketed;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

export const pieVisualization: Visualization<PieVisualizationState, PieVisualizationState> = {
  id: 'lnsPie',

  visualizationTypes: [
    {
      id: 'donut',
      largeIcon: CHART_NAMES.donut.icon,
      label: CHART_NAMES.donut.label,
    },
    {
      id: 'pie',
      largeIcon: CHART_NAMES.pie.icon,
      label: CHART_NAMES.pie.label,
    },
    {
      id: 'treemap',
      largeIcon: CHART_NAMES.treemap.icon,
      label: CHART_NAMES.treemap.label,
    },
  ],

  getVisualizationTypeId(state) {
    return state.shape;
  },

  getLayerIds(state) {
    return state.layers.map((l) => l.layerId);
  },

  clearLayer(state) {
    return {
      shape: state.shape,
      layers: state.layers.map((l) => newLayerState(l.layerId)),
    };
  },

  getDescription(state) {
    if (state.shape === 'treemap') {
      return CHART_NAMES.treemap;
    }
    if (state.shape === 'donut') {
      return CHART_NAMES.donut;
    }
    return CHART_NAMES.pie;
  },

  switchVisualizationType: (visualizationTypeId, state) => ({
    ...state,
    shape: visualizationTypeId as PieVisualizationState['shape'],
  }),

  initialize(frame, state) {
    return (
      state || {
        shape: 'donut',
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getPersistableState: (state) => state,

  getSuggestions: suggestions,

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];
    const originalOrder = datasource
      .getTableSpec()
      .map(({ columnId }) => columnId)
      .filter((columnId) => columnId !== layer.metric);
    // When we add a column it could be empty, and therefore have no order
    const sortedColumns = Array.from(new Set(originalOrder.concat(layer.groups)));

    if (state.shape === 'treemap') {
      return {
        groups: [
          {
            groupId: 'groups',
            groupLabel: i18n.translate('xpack.lens.pie.treemapGroupLabel', {
              defaultMessage: 'Group by',
            }),
            layerId,
            accessors: sortedColumns,
            supportsMoreColumns: sortedColumns.length < MAX_TREEMAP_BUCKETS,
            filterOperations: bucketedOperations,
            required: true,
          },
          {
            groupId: 'metric',
            groupLabel: i18n.translate('xpack.lens.pie.groupsizeLabel', {
              defaultMessage: 'Size by',
            }),
            layerId,
            accessors: layer.metric ? [layer.metric] : [],
            supportsMoreColumns: !layer.metric,
            filterOperations: numberMetricOperations,
            required: true,
          },
        ],
      };
    }

    return {
      groups: [
        {
          groupId: 'groups',
          groupLabel: i18n.translate('xpack.lens.pie.sliceGroupLabel', {
            defaultMessage: 'Slice by',
          }),
          layerId,
          accessors: sortedColumns,
          supportsMoreColumns: sortedColumns.length < MAX_PIE_BUCKETS,
          filterOperations: bucketedOperations,
          required: true,
        },
        {
          groupId: 'metric',
          groupLabel: i18n.translate('xpack.lens.pie.groupsizeLabel', {
            defaultMessage: 'Size by',
          }),
          layerId,
          accessors: layer.metric ? [layer.metric] : [],
          supportsMoreColumns: !layer.metric,
          filterOperations: numberMetricOperations,
          required: true,
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    return {
      ...prevState,

      shape:
        prevState.shape === 'donut' && prevState.layers.every((l) => l.groups.length === 1)
          ? 'pie'
          : prevState.shape,
      layers: prevState.layers.map((l) => {
        if (l.layerId !== layerId) {
          return l;
        }
        if (groupId === 'groups') {
          return { ...l, groups: [...l.groups, columnId] };
        }
        return { ...l, metric: columnId };
      }),
    };
  },
  removeDimension({ prevState, layerId, columnId }) {
    return {
      ...prevState,
      layers: prevState.layers.map((l) => {
        if (l.layerId !== layerId) {
          return l;
        }

        if (l.metric === columnId) {
          return { ...l, metric: undefined };
        }
        return { ...l, groups: l.groups.filter((c) => c !== columnId) };
      }),
    };
  },

  toExpression,
  toPreviewExpression,

  renderLayerContextMenu(domElement, props) {
    render(
      <I18nProvider>
        <SettingsWidget {...props} />
      </I18nProvider>,
      domElement
    );
  },
};
