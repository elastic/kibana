/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PaletteRegistry } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Visualization, OperationMetadata, layerTypes } from '@kbn/lens-plugin/public';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import type { GraphState } from './types';
import { toExpression } from './expression';
import { DimensionEditor } from './dimension_editor';

export const getVisualization = ({
  theme,
  paletteService,
}: {
  theme: ThemeServiceStart;
  paletteService: PaletteRegistry;
}): Visualization<GraphState> => ({
  id: 'graphVisualization',

  visualizationTypes: [
    {
      id: 'graphVisualization',
      icon: 'graphApp',
      label: 'Graph - Spread',
      groupLabel: 'Connections and flow',
      sortPriority: 1,
      showExperimentalBadge: true,
    },
  ],

  getVisualizationTypeId() {
    return 'graphVisualization';
  },

  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
      metrics: [],
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: 'graphApp',
      label: 'Graph - Spread',
    };
  },

  getSuggestions: ({ state, table }) => {
    return [];
  },

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
        metricConfig: [],
      }
    );
  },

  getConfiguration({ state }) {
    return {
      groups: [
        {
          groupId: 'entities',
          groupLabel: i18n.translate('xpack.graph.lens.graphChart.entitiesKeyLabel', {
            defaultMessage: 'Entities',
          }),
          layerId: state.layerId,
          accessors: state.accessor
            ? [
                {
                  columnId: state.accessor,
                  triggerIcon: 'colorBy',
                  palette: paletteService
                    .get(state.palette?.name || 'default')
                    .getCategoricalColors(10),
                },
              ]
            : [],
          filterOperations: (op: OperationMetadata) => op.isBucketed && op.scale === 'ordinal',
          enableDimensionEditor: true,
          required: true,
          dataTestSubj: 'lnsGraph_entitiesKeyDimensionPanel',
          supportsMoreColumns: !state.accessor,
        },
        {
          groupId: 'metrics',
          groupLabel: 'Metrics',
          layerId: state.layerId,
          accessors: (state.metrics ?? []).map((id) => {
            const config = (state.metricConfig || []).find(({ metricId }) => metricId === id);
            const hasColoring = config?.mapValuesTo === 'color';
            const stops = config?.palette?.params?.stops;
            return hasColoring
              ? {
                  columnId: id,
                  triggerIcon: 'colorBy',
                  palette: stops ? stops.map(({ color }) => color) : undefined,
                }
              : { columnId: id };
          }),
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
          enableDimensionEditor: true,
          supportsMoreColumns: true,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsGraph_entitiesKeyDimensionPanel',
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.graph.lens.graphChart.addLayer', {
          defaultMessage: 'Add visualization layer',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return layerTypes.DATA;
    }
  },

  toExpression: (state, _layers, _attributes, datasourceExpression) =>
    toExpression(state, datasourceExpression || {}, paletteService),
  toPreviewExpression: (state, _layers, datasourceExpression) => null,

  setDimension({ prevState, columnId, groupId }) {
    if (groupId === 'entities') {
      return { ...prevState, accessor: columnId };
    }
    return {
      ...prevState,
      metrics: (prevState.metrics || []).filter((a) => a !== columnId).concat(columnId),
      metricConfig: (prevState.metricConfig || []).concat({
        metricId: columnId,
        mapValuesTo: 'size',
        maxWidth: 50,
      }),
    };
  },

  removeDimension({ prevState, columnId }) {
    if (prevState.accessor === columnId) {
      return { ...prevState, accessor: undefined };
    }
    return {
      ...prevState,
      metrics: (prevState.metrics || []).filter((a) => a !== columnId),
      metricConfig: (prevState.metricConfig || []).filter(({ metricId }) => metricId === columnId),
    };
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <DimensionEditor {...props} paletteService={paletteService} />
      </KibanaThemeProvider>,
      domElement
    );
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },
});
