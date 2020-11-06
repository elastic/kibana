/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { getSuggestions } from './xy_suggestions';
import { LayerContextMenu, XyToolbar, DimensionEditor } from './xy_config_panel';
import { Visualization, OperationMetadata, VisualizationType } from '../types';
import { State, SeriesType, visualizationTypes, LayerConfig } from './types';
import { isHorizontalChart } from './state_helpers';
import { toExpression, toPreviewExpression, getSortedAccessors } from './to_expression';
import { LensIconChartBarStacked } from '../assets/chart_bar_stacked';
import { LensIconChartMixedXy } from '../assets/chart_mixed_xy';
import { LensIconChartBarHorizontal } from '../assets/chart_bar_horizontal';

const defaultIcon = LensIconChartBarStacked;
const defaultSeriesType = 'bar_stacked';
const isNumericMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';
const isBucketed = (op: OperationMetadata) => op.isBucketed;

function getVisualizationType(state: State): VisualizationType | 'mixed' {
  if (!state.layers.length) {
    return (
      visualizationTypes.find((t) => t.id === state.preferredSeriesType) ?? visualizationTypes[0]
    );
  }
  const visualizationType = visualizationTypes.find((t) => t.id === state.layers[0].seriesType);
  const seriesTypes = _.uniq(state.layers.map((l) => l.seriesType));

  return visualizationType && seriesTypes.length === 1 ? visualizationType : 'mixed';
}

function getDescription(state?: State) {
  if (!state) {
    return {
      icon: defaultIcon,
      label: i18n.translate('xpack.lens.xyVisualization.xyLabel', {
        defaultMessage: 'XY',
      }),
    };
  }

  const visualizationType = getVisualizationType(state);

  if (visualizationType === 'mixed' && isHorizontalChart(state.layers)) {
    return {
      icon: LensIconChartBarHorizontal,
      label: i18n.translate('xpack.lens.xyVisualization.mixedBarHorizontalLabel', {
        defaultMessage: 'Mixed H. bar',
      }),
    };
  }

  if (visualizationType === 'mixed') {
    return {
      icon: LensIconChartMixedXy,
      label: i18n.translate('xpack.lens.xyVisualization.mixedLabel', {
        defaultMessage: 'Mixed XY',
      }),
    };
  }

  return {
    icon: visualizationType.icon,
    label: visualizationType.label,
  };
}

export const getXyVisualization = ({
  paletteService,
}: {
  paletteService: PaletteRegistry;
}): Visualization<State> => ({
  id: 'lnsXY',

  visualizationTypes,
  getVisualizationTypeId(state) {
    const type = getVisualizationType(state);
    return type === 'mixed' ? type : type.id;
  },

  getLayerIds(state) {
    return state.layers.map((l) => l.layerId);
  },

  removeLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.filter((l) => l.layerId !== layerId),
    };
  },

  appendLayer(state, layerId) {
    const usedSeriesTypes = _.uniq(state.layers.map((layer) => layer.seriesType));
    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState(
          usedSeriesTypes.length === 1 ? usedSeriesTypes[0] : state.preferredSeriesType,
          layerId
        ),
      ],
    };
  },

  clearLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.map((l) =>
        l.layerId !== layerId ? l : newLayerState(state.preferredSeriesType, layerId)
      ),
    };
  },

  getDescription(state) {
    const { icon, label } = getDescription(state);

    return {
      icon: icon || defaultIcon,
      label,
    };
  },

  switchVisualizationType(seriesType: string, state: State) {
    return {
      ...state,
      preferredSeriesType: seriesType as SeriesType,
      layers: state.layers.map((layer) => ({ ...layer, seriesType: seriesType as SeriesType })),
    };
  },

  getSuggestions,

  initialize(frame, state) {
    return (
      state || {
        title: 'Empty XY chart',
        legend: { isVisible: true, position: Position.Right },
        valueLabels: 'hide',
        preferredSeriesType: defaultSeriesType,
        layers: [
          {
            layerId: frame.addNewLayer(),
            accessors: [],
            position: Position.Top,
            seriesType: defaultSeriesType,
            showGridlines: false,
          },
        ],
      }
    );
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];

    const sortedAccessors = getSortedAccessors(datasource, layer);

    const isHorizontal = isHorizontalChart(state.layers);
    return {
      groups: [
        {
          groupId: 'x',
          groupLabel: isHorizontal
            ? i18n.translate('xpack.lens.xyChart.verticalAxisLabel', {
                defaultMessage: 'Vertical axis',
              })
            : i18n.translate('xpack.lens.xyChart.horizontalAxisLabel', {
                defaultMessage: 'Horizontal axis',
              }),
          accessors: layer.xAccessor ? [layer.xAccessor] : [],
          filterOperations: isBucketed,
          suggestedPriority: 1,
          supportsMoreColumns: !layer.xAccessor,
          required: !layer.seriesType.includes('percentage'),
          dataTestSubj: 'lnsXY_xDimensionPanel',
        },
        {
          groupId: 'y',
          groupLabel: isHorizontal
            ? i18n.translate('xpack.lens.xyChart.horizontalAxisLabel', {
                defaultMessage: 'Horizontal axis',
              })
            : i18n.translate('xpack.lens.xyChart.verticalAxisLabel', {
                defaultMessage: 'Vertical axis',
              }),
          accessors: sortedAccessors,
          filterOperations: isNumericMetric,
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsXY_yDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          groupId: 'breakdown',
          groupLabel: i18n.translate('xpack.lens.xyChart.splitSeries', {
            defaultMessage: 'Break down by',
          }),
          accessors: layer.splitAccessor ? [layer.splitAccessor] : [],
          filterOperations: isBucketed,
          suggestedPriority: 0,
          supportsMoreColumns: !layer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          required: layer.seriesType.includes('percentage'),
          enableDimensionEditor: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    return state.layers[0].palette;
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    const newLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!newLayer) {
      return prevState;
    }

    if (groupId === 'x') {
      newLayer.xAccessor = columnId;
    }
    if (groupId === 'y') {
      newLayer.accessors = [...newLayer.accessors.filter((a) => a !== columnId), columnId];
    }
    if (groupId === 'breakdown') {
      newLayer.splitAccessor = columnId;
    }

    return {
      ...prevState,
      layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const newLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!newLayer) {
      return prevState;
    }

    if (newLayer.xAccessor === columnId) {
      delete newLayer.xAccessor;
    } else if (newLayer.splitAccessor === columnId) {
      delete newLayer.splitAccessor;
      // as the palette is associated with the break down by dimension, remove it together with the dimension
      delete newLayer.palette;
    } else if (newLayer.accessors.includes(columnId)) {
      newLayer.accessors = newLayer.accessors.filter((a) => a !== columnId);
    }

    if (newLayer.yConfig) {
      newLayer.yConfig = newLayer.yConfig.filter(({ forAccessor }) => forAccessor !== columnId);
    }

    return {
      ...prevState,
      layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },

  getLayerContextMenuIcon({ state, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    return visualizationTypes.find((t) => t.id === layer?.seriesType)?.icon;
  },

  renderLayerContextMenu(domElement, props) {
    render(
      <I18nProvider>
        <LayerContextMenu {...props} />
      </I18nProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <XyToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <DimensionEditor {...props} />
      </I18nProvider>,
      domElement
    );
  },

  toExpression: (state, layers, attributes) =>
    toExpression(state, layers, paletteService, attributes),
  toPreviewExpression: (state, layers) => toPreviewExpression(state, layers, paletteService),
});

function newLayerState(seriesType: SeriesType, layerId: string): LayerConfig {
  return {
    layerId,
    seriesType,
    accessors: [],
  };
}
