/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { Ast } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import { CUSTOM_PALETTE, PaletteRegistry, CustomPaletteParams } from '@kbn/coloring';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { HeatmapIcon } from '../../../../../src/plugins/chart_expressions/expression_heatmap/public';
import type { OperationMetadata, Visualization } from '../types';
import type { HeatmapVisualizationState } from './types';
import { getSuggestions } from './suggestions';
import {
  CHART_NAMES,
  CHART_SHAPES,
  DEFAULT_PALETTE_NAME,
  FUNCTION_NAME,
  GROUP_ID,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
  LENS_HEATMAP_ID,
} from './constants';
import { HeatmapToolbar } from './toolbar_component';
import { HeatmapDimensionEditor } from './dimension_editor';
import { getSafePaletteParams } from './utils';
import { DEFAULT_LEGEND_SIZE, layerTypes } from '../../common';

const groupLabelForHeatmap = i18n.translate('xpack.lens.heatmapVisualization.heatmapGroupLabel', {
  defaultMessage: 'Magnitude',
});

interface HeatmapVisualizationDeps {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
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
const isNumericMetric = (op: OperationMetadata) => op.dataType === 'number' && !op.isStaticValue;

export const filterOperationsAxis = (op: OperationMetadata) =>
  isBucketed(op) || op.scale === 'interval';

export const isCellValueSupported = (op: OperationMetadata) => {
  return !isBucketed(op) && (op.scale === 'ordinal' || op.scale === 'ratio') && isNumericMetric(op);
};

function getInitialState(): Omit<HeatmapVisualizationState, 'layerId' | 'layerType'> {
  return {
    shape: CHART_SHAPES.HEATMAP,
    legend: {
      isVisible: true,
      position: Position.Right,
      legendSize: DEFAULT_LEGEND_SIZE,
      maxLines: 1,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
      isYAxisTitleVisible: true,
      isXAxisTitleVisible: true,
    },
  };
}

function computePaletteParams(params: CustomPaletteParams) {
  return {
    ...params,
    // rewrite colors and stops as two distinct arguments
    colors: (params?.stops || []).map(({ color }) => color),
    stops: params?.name === 'custom' ? (params?.stops || []).map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

export const getHeatmapVisualization = ({
  paletteService,
  theme,
}: HeatmapVisualizationDeps): Visualization<HeatmapVisualizationState> => ({
  id: LENS_HEATMAP_ID,

  visualizationTypes: [
    {
      id: 'heatmap',
      icon: HeatmapIcon,
      label: i18n.translate('xpack.lens.heatmapVisualization.heatmapLabel', {
        defaultMessage: 'Heat map',
      }),
      groupLabel: groupLabelForHeatmap,
      showExperimentalBadge: false,
      sortPriority: 1,
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

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
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

    const { displayStops, activePalette } = getSafePaletteParams(
      paletteService,
      frame.activeData?.[state.layerId],
      state.valueAccessor,
      state?.palette && state.palette.accessor === state.valueAccessor ? state.palette : undefined
    );

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
          accessors: state.valueAccessor
            ? [
                // When data is not available and the range type is numeric, return a placeholder while refreshing
                displayStops.length &&
                (frame.activeData || activePalette?.params?.rangeType !== 'number')
                  ? {
                      columnId: state.valueAccessor,
                      triggerIcon: 'colorBy',
                      palette: displayStops.map(({ color }) => color),
                    }
                  : {
                      columnId: state.valueAccessor,
                      triggerIcon: 'none',
                    },
              ]
            : [],
          filterOperations: isCellValueSupported,
          supportsMoreColumns: !state.valueAccessor,
          enableDimensionEditor: true,
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

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <HeatmapDimensionEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <HeatmapToolbar {...props} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.heatmap.addLayer', {
          defaultMessage: 'Visualization',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
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
            xAccessor: [state.xAccessor ?? ''],
            yAccessor: [state.yAccessor ?? ''],
            valueAccessor: [state.valueAccessor ?? ''],
            lastRangeIsRightOpen: [
              state.palette?.params?.continuity
                ? ['above', 'all'].includes(state.palette.params.continuity)
                : true,
            ],
            palette: state.palette?.params
              ? [
                  paletteService
                    .get(CUSTOM_PALETTE)
                    .toExpression(
                      computePaletteParams((state.palette?.params || {}) as CustomPaletteParams)
                    ),
                ]
              : [paletteService.get(DEFAULT_PALETTE_NAME).toExpression()],
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
                      legendSize: [state.legend.legendSize],
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
                      // cells
                      isCellLabelVisible: [state.gridConfig.isCellLabelVisible],
                      // Y-axis
                      isYAxisLabelVisible: [state.gridConfig.isYAxisLabelVisible],
                      isYAxisTitleVisible: [state.gridConfig.isYAxisTitleVisible ?? false],
                      yTitle: state.gridConfig.yTitle ? [state.gridConfig.yTitle] : [],
                      // X-axis
                      isXAxisLabelVisible: state.gridConfig.isXAxisLabelVisible
                        ? [state.gridConfig.isXAxisLabelVisible]
                        : [],
                      isXAxisTitleVisible: [state.gridConfig.isXAxisTitleVisible ?? false],
                      xTitle: state.gridConfig.xTitle ? [state.gridConfig.xTitle] : [],
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
            palette: state.palette?.params
              ? [
                  paletteService
                    .get(CUSTOM_PALETTE)
                    .toExpression(
                      computePaletteParams((state.palette?.params || {}) as CustomPaletteParams)
                    ),
                ]
              : [paletteService.get(DEFAULT_PALETTE_NAME).toExpression()],
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
                      isYAxisTitleVisible: [state.gridConfig.isYAxisTitleVisible],
                      yTitle: [state.gridConfig.yTitle ?? ''],
                      // X-axis
                      isXAxisLabelVisible: [false],
                      isXAxisTitleVisible: [state.gridConfig.isXAxisTitleVisible],
                      xTitle: [state.gridConfig.xTitle ?? ''],
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
