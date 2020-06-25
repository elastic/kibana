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
import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { getSuggestions } from './xy_suggestions';
import { LayerContextMenu } from './xy_config_panel';
import { Visualization, OperationMetadata, VisualizationType } from '../types';
import {
  State,
  PersistableState,
  SeriesType,
  visualizationTypes,
  YAxisMode,
  LayerConfig,
} from './types';
import chartBarStackedSVG from '../assets/chart_bar_stacked.svg';
import chartMixedSVG from '../assets/chart_mixed_xy.svg';
import { isHorizontalChart } from './state_helpers';
import { toExpression, toPreviewExpression } from './to_expression';

const defaultIcon = chartBarStackedSVG;
const defaultSeriesType = 'bar_stacked';
const isNumericMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';
const isBucketed = (op: OperationMetadata) => op.isBucketed;

// TODO move into xy_config_panel
const idPrefix = htmlIdGenerator()();
type UnwrapArray<T> = T extends Array<infer P> ? P : T;
function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

function getVisualizationType(state: State): VisualizationType | 'mixed' {
  if (!state.layers.length) {
    return (
      visualizationTypes.find((t) => t.id === state.preferredSeriesType) ?? visualizationTypes[0]
    );
  }
  const visualizationType = visualizationTypes.find((t) => t.id === state.layers[0].seriesType);
  const seriesTypes = _.unique(state.layers.map((l) => l.seriesType));

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

  if (!state.layers.length) {
    const preferredType = visualizationType as VisualizationType;
    return {
      icon: preferredType.largeIcon || preferredType.icon,
      label: preferredType.label,
    };
  }

  return {
    icon:
      visualizationType === 'mixed'
        ? chartMixedSVG
        : visualizationType.largeIcon || visualizationType.icon,
    label:
      visualizationType === 'mixed'
        ? isHorizontalChart(state.layers)
          ? i18n.translate('xpack.lens.xyVisualization.mixedBarHorizontalLabel', {
              defaultMessage: 'Mixed horizontal bar',
            })
          : i18n.translate('xpack.lens.xyVisualization.mixedLabel', {
              defaultMessage: 'Mixed XY',
            })
        : visualizationType.label,
  };
}

export const xyVisualization: Visualization<State, PersistableState> = {
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
    const chartLabel = i18n.translate('xpack.lens.xyVisualization.chartLabel', {
      defaultMessage: '{label} chart',
      values: { label },
    });

    return {
      icon: icon || defaultIcon,
      label: chartLabel,
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

  getPersistableState: (state) => state,

  getConfiguration(props) {
    const layer = props.state.layers.find((l) => l.layerId === props.layerId)!;
    return {
      groups: [
        {
          groupId: 'x',
          groupLabel: i18n.translate('xpack.lens.xyChart.xAxisLabel', {
            defaultMessage: 'X-axis',
          }),
          accessors: layer.xAccessor ? [layer.xAccessor] : [],
          filterOperations: isBucketed,
          suggestedPriority: 1,
          supportsMoreColumns: !layer.xAccessor,
          required: true,
          dataTestSubj: 'lnsXY_xDimensionPanel',
        },
        {
          groupId: 'y',
          groupLabel: i18n.translate('xpack.lens.xyChart.yAxisLabel', {
            defaultMessage: 'Y-axis',
          }),
          accessors: layer.accessors,
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
        },
      ],
    };
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
    } else if (newLayer.accessors.includes(columnId)) {
      newLayer.accessors = newLayer.accessors.filter((a) => a !== columnId);
    }

    if (newLayer.yAxisConfig) {
      newLayer.yAxisConfig = newLayer.yAxisConfig.filter(
        ({ forAccessor }) => forAccessor !== columnId
      );
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

  renderDimensionEditor(domElement, { state, layerId, setState, accessor }) {
    // TODO move this in xy_config_panel
    const index = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[index];
    const axisMode =
      (layer.yAxisConfig &&
        layer.yAxisConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.mode) ||
      'auto';
    render(
      <I18nProvider>
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.lens.xyChart.axisSide.label', {
            defaultMessage: 'Axis side',
          })}
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.lens.xyChart.axisSide.label', {
              defaultMessage: 'Axis side',
            })}
            name="axisSide"
            buttonSize="compressed"
            className="eui-displayInlineBlock"
            options={[
              {
                id: `${idPrefix}auto`,
                label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                  defaultMessage: 'Auto',
                }),
              },
              {
                id: `${idPrefix}left`,
                label: i18n.translate('xpack.lens.xyChart.axisSide.left', {
                  defaultMessage: 'Left',
                }),
              },
              {
                id: `${idPrefix}right`,
                label: i18n.translate('xpack.lens.xyChart.axisSide.right', {
                  defaultMessage: 'Right',
                }),
              },
            ]}
            idSelected={`${idPrefix}${axisMode}`}
            onChange={(id) => {
              const newMode = id.replace(idPrefix, '') as YAxisMode;
              const newYAxisConfigs = [...(layer.yAxisConfig || [])];
              const existingIndex = newYAxisConfigs.findIndex(
                (yAxisConfig) => yAxisConfig.forAccessor === accessor
              );
              if (existingIndex !== -1) {
                newYAxisConfigs[existingIndex].mode = newMode;
              } else {
                newYAxisConfigs.push({
                  forAccessor: accessor,
                  mode: newMode,
                });
              }
              setState(updateLayer(state, { ...layer, yAxisConfig: newYAxisConfigs }, index));
            }}
          />
        </EuiFormRow>
      </I18nProvider>,
      domElement
    );
  },

  toExpression,
  toPreviewExpression,
};

function newLayerState(seriesType: SeriesType, layerId: string): LayerConfig {
  return {
    layerId,
    seriesType,
    accessors: [],
  };
}
