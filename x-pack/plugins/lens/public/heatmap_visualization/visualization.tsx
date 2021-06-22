/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { Ast } from '@kbn/interpreter/common';
import { Position } from '@elastic/charts';
import { PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { OperationMetadata, Visualization } from '../types';
import { HeatmapVisualizationState } from './types';
import { getSuggestions } from './suggestions';
import {
  CHART_NAMES,
  CHART_SHAPES,
  FUNCTION_NAME,
  GROUP_ID,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
  LENS_HEATMAP_ID,
} from './constants';
import { HeatmapToolbar } from './toolbar_component';
import { LensIconChartHeatmap } from '../assets/chart_heatmap';

const groupLabelForBar = i18n.translate('xpack.lens.heatmapVisualization.heatmapGroupLabel', {
  defaultMessage: 'Heatmap',
});

interface HeatmapVisualizationDeps {
  paletteService?: PaletteRegistry;
}

function getAxisName(axis: 'x' | 'y') {
  const vertical = i18n.translate('xpack.lens.heatmap.verticalAxisLabel', {
    defaultMessage: 'Vertical axis',
  });
  const horizontal = i18n.translate('xpack.lens.heatmap.horizontalAxisLabel', {
    defaultMessage: 'Horizontal axis',
  });
  if (axis === 'x') {
    return horizontal;
  }
  return vertical;
}

export const isBucketed = (op: OperationMetadata) => op.isBucketed && op.scale === 'ordinal';
const isNumericMetric = (op: OperationMetadata) => op.dataType === 'number';

export const filterOperationsAxis = (op: OperationMetadata) =>
  isBucketed(op) || op.scale === 'interval';

export const isCellValueSupported = (op: OperationMetadata) => {
  return !isBucketed(op) && (op.scale === 'ordinal' || op.scale === 'ratio') && isNumericMetric(op);
};

function getInitialState(): Omit<HeatmapVisualizationState, 'layerId'> {
  return {
    shape: CHART_SHAPES.HEATMAP,
    legend: {
      isVisible: true,
      position: Position.Right,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
    },
  };
}

export const getHeatmapVisualization = ({
  paletteService,
}: HeatmapVisualizationDeps): Visualization<HeatmapVisualizationState> => ({
  id: LENS_HEATMAP_ID,

  visualizationTypes: [
    {
      id: 'heatmap',
      icon: LensIconChartHeatmap,
      label: i18n.translate('xpack.lens.heatmapVisualization.heatmapLabel', {
        defaultMessage: 'Heatmap',
      }),
      groupLabel: groupLabelForBar,
      showExperimentalBadge: true,
    },
  ],

  getVisualizationTypeId(state) {
    return state.shape;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  clearLayer(state) {
    const newState = { ...state };
    delete newState.valueAccessor;
    delete newState.xAccessor;
    delete newState.yAccessor;
    return newState;
  },

  switchVisualizationType: (visualizationTypeId, state) => {
    return {
      ...state,
      shape: visualizationTypeId as typeof CHART_SHAPES.HEATMAP,
    };
  },

  getDescription(state) {
    return CHART_NAMES.heatmap;
  },

  initialize(frame, state, mainPalette) {
    return (
      state || {
        layerId: frame.addNewLayer(),
        title: 'Empty Heatmap chart',
        ...getInitialState(),
      }
    );
  },

  getSuggestions,

  getConfiguration({ state, frame, layerId }) {
    const datasourceLayer = frame.datasourceLayers[layerId];

    const originalOrder = datasourceLayer.getTableSpec().map(({ columnId }) => columnId);
    if (!originalOrder) {
      return { groups: [] };
    }

    return {
      groups: [
        {
          layerId: state.layerId,
          groupId: GROUP_ID.X,
          groupLabel: getAxisName(GROUP_ID.X),
          accessors: state.xAccessor ? [{ columnId: state.xAccessor }] : [],
          filterOperations: filterOperationsAxis,
          supportsMoreColumns: !state.xAccessor,
          required: true,
          dataTestSubj: 'lnsHeatmap_xDimensionPanel',
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.Y,
          groupLabel: getAxisName(GROUP_ID.Y),
          accessors: state.yAccessor ? [{ columnId: state.yAccessor }] : [],
          filterOperations: filterOperationsAxis,
          supportsMoreColumns: !state.yAccessor,
          required: false,
          dataTestSubj: 'lnsHeatmap_yDimensionPanel',
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.CELL,
          groupLabel: i18n.translate('xpack.lens.heatmap.cellValueLabel', {
            defaultMessage: 'Cell value',
          }),
          accessors: state.valueAccessor ? [{ columnId: state.valueAccessor }] : [],
          filterOperations: isCellValueSupported,
          supportsMoreColumns: !state.valueAccessor,
          required: true,
          dataTestSubj: 'lnsHeatmap_cellPanel',
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const update: Partial<HeatmapVisualizationState> = {};
    if (groupId === GROUP_ID.X) {
      update.xAccessor = columnId;
    }
    if (groupId === GROUP_ID.Y) {
      update.yAccessor = columnId;
    }
    if (groupId === GROUP_ID.CELL) {
      update.valueAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.valueAccessor === columnId) {
      delete update.valueAccessor;
    }
    if (prevState.xAccessor === columnId) {
      delete update.xAccessor;
    }
    if (prevState.yAccessor === columnId) {
      delete update.yAccessor;
    }

    return update;
  },

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <HeatmapToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  toExpression(state, datasourceLayers, attributes): Ast | null {
    const datasource = datasourceLayers[state.layerId];

    const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

    if (!originalOrder || !state.valueAccessor) {
      return null;
    }

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: FUNCTION_NAME,
          arguments: {
            title: [attributes?.title ?? ''],
            description: [attributes?.description ?? ''],
            xAccessor: [state.xAccessor ?? ''],
            yAccessor: [state.yAccessor ?? ''],
            valueAccessor: [state.valueAccessor ?? ''],
            legend: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: LEGEND_FUNCTION,
                    arguments: {
                      isVisible: [state.legend.isVisible],
                      position: [state.legend.position],
                    },
                  },
                ],
              },
            ],
            gridConfig: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: HEATMAP_GRID_FUNCTION,
                    arguments: {
                      // grid
                      strokeWidth: state.gridConfig.strokeWidth
                        ? [state.gridConfig.strokeWidth]
                        : [],
                      strokeColor: state.gridConfig.strokeColor
                        ? [state.gridConfig.strokeColor]
                        : [],
                      cellHeight: state.gridConfig.cellHeight ? [state.gridConfig.cellHeight] : [],
                      cellWidth: state.gridConfig.cellWidth ? [state.gridConfig.cellWidth] : [],
                      // cells
                      isCellLabelVisible: [state.gridConfig.isCellLabelVisible],
                      // Y-axis
                      isYAxisLabelVisible: [state.gridConfig.isYAxisLabelVisible],
                      yAxisLabelWidth: state.gridConfig.yAxisLabelWidth
                        ? [state.gridConfig.yAxisLabelWidth]
                        : [],
                      yAxisLabelColor: state.gridConfig.yAxisLabelColor
                        ? [state.gridConfig.yAxisLabelColor]
                        : [],
                      // X-axis
                      isXAxisLabelVisible: state.gridConfig.isXAxisLabelVisible
                        ? [state.gridConfig.isXAxisLabelVisible]
                        : [],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  toPreviewExpression(state, datasourceLayers): Ast | null {
    const datasource = datasourceLayers[state.layerId];

    const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

    if (!originalOrder) {
      return null;
    }

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: FUNCTION_NAME,
          arguments: {
            title: [''],
            description: [''],
            xAccessor: [state.xAccessor ?? ''],
            yAccessor: [state.yAccessor ?? ''],
            valueAccessor: [state.valueAccessor ?? ''],
            legend: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: LEGEND_FUNCTION,
                    arguments: {
                      isVisible: [false],
                      position: [],
                    },
                  },
                ],
              },
            ],
            gridConfig: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: HEATMAP_GRID_FUNCTION,
                    arguments: {
                      // grid
                      strokeWidth: [1],
                      // cells
                      isCellLabelVisible: [false],
                      // Y-axis
                      isYAxisLabelVisible: [false],
                      // X-axis
                      isXAxisLabelVisible: [false],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  getErrorMessages(state) {
    if (!state.yAccessor && !state.xAccessor && !state.valueAccessor) {
      // nothing configured yet
      return;
    }

    const errors: ReturnType<Visualization['getErrorMessages']> = [];

    if (!state.xAccessor) {
      errors.push({
        shortMessage: i18n.translate(
          'xpack.lens.heatmapVisualization.missingXAccessorShortMessage',
          {
            defaultMessage: 'Missing Horizontal axis.',
          }
        ),
        longMessage: i18n.translate('xpack.lens.heatmapVisualization.missingXAccessorLongMessage', {
          defaultMessage: 'Configuration for the horizontal axis is missing.',
        }),
      });
    }

    return errors.length ? errors : undefined;
  },

  getWarningMessages(state, frame) {
    if (!state?.layerId || !frame.activeData || !state.valueAccessor) {
      return;
    }

    const rows = frame.activeData[state.layerId] && frame.activeData[state.layerId].rows;
    if (!rows) {
      return;
    }

    const hasArrayValues = rows.some((row) => Array.isArray(row[state.valueAccessor!]));

    const datasource = frame.datasourceLayers[state.layerId];
    const operation = datasource.getOperationForColumnId(state.valueAccessor);

    return hasArrayValues
      ? [
          <FormattedMessage
            id="xpack.lens.heatmapVisualization.arrayValuesWarningMessage"
            defaultMessage="{label} contains array values. Your visualization may not render as expected."
            values={{ label: <strong>{operation?.label}</strong> }}
          />,
        ]
      : undefined;
  },
});
