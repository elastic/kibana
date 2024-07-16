/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Ast } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import { IconChartHeatmap } from '@kbn/chart-icons';
import { CUSTOM_PALETTE, PaletteRegistry, CustomPaletteParams } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { HeatmapConfiguration } from '@kbn/visualizations-plugin/common';
import {
  HeatmapExpressionFunctionDefinition,
  HeatmapGridExpressionFunctionDefinition,
  HeatmapLegendExpressionFunctionDefinition,
} from '@kbn/expression-heatmap-plugin/common';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { OperationMetadata, Suggestion, UserMessage, Visualization } from '../../types';
import type { HeatmapVisualizationState } from './types';
import { getSuggestions } from './suggestions';
import {
  CHART_NAMES,
  CHART_SHAPES,
  DEFAULT_PALETTE_NAME,
  GROUP_ID,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
  LENS_HEATMAP_ID,
} from './constants';
import { HeatmapToolbar } from './toolbar_component';
import { HeatmapDimensionEditor } from './dimension_editor';
import { getSafePaletteParams } from './utils';
import { FormBasedPersistedState } from '../..';
import { HEATMAP_RENDER_ARRAY_VALUES, HEATMAP_X_MISSING_AXIS } from '../../user_messages_ids';

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
      icon: IconChartHeatmap,
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
        layerType: LayerTypes.DATA,
        title: 'Empty Heatmap chart',
        ...getInitialState(),
      }
    );
  },

  getSuggestions,

  triggers: [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],

  getConfiguration({ state, frame, layerId }) {
    const datasourceLayer = frame.datasourceLayers[layerId];

    const originalOrder = datasourceLayer?.getTableSpec().map(({ columnId }) => columnId);
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
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsHeatmap_xDimensionPanel',
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.Y,
          groupLabel: getAxisName(GROUP_ID.Y),
          accessors: state.yAccessor ? [{ columnId: state.yAccessor }] : [],
          filterOperations: filterOperationsAxis,
          supportsMoreColumns: !state.yAccessor,
          requiredMinDimensionCount: 0,
          isBreakdownDimension: true,
          dataTestSubj: 'lnsHeatmap_yDimensionPanel',
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.CELL,
          groupLabel: i18n.translate('xpack.lens.heatmap.cellValueLabel', {
            defaultMessage: 'Cell value',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.heatmap.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          accessors: state.valueAccessor
            ? [
                // When data is not available and the range type is numeric, return a placeholder while refreshing
                displayStops.length &&
                (frame.activeData || activePalette?.params?.rangeType !== 'number')
                  ? {
                      columnId: state.valueAccessor,
                      triggerIconType: 'colorBy',
                      palette: displayStops.map(({ color }) => color),
                    }
                  : {
                      columnId: state.valueAccessor,
                      triggerIconType: 'none',
                    },
              ]
            : [],
          filterOperations: isCellValueSupported,
          isMetricDimension: true,
          supportsMoreColumns: !state.valueAccessor,
          enableDimensionEditor: true,
          requiredMinDimensionCount: 1,
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

  DimensionEditorComponent(props) {
    return <HeatmapDimensionEditor {...props} paletteService={paletteService} />;
  },

  ToolbarComponent(props) {
    return <HeatmapToolbar {...props} />;
  },

  getSupportedLayers() {
    return [
      {
        type: LayerTypes.DATA,
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

  toExpression(
    state,
    datasourceLayers,
    attributes,
    datasourceExpressionsByLayers = {}
  ): Ast | null {
    const datasource = datasourceLayers[state.layerId];
    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

    const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

    if (!originalOrder || !state.valueAccessor) {
      return null;
    }

    const legendFn = buildExpressionFunction<HeatmapLegendExpressionFunctionDefinition>(
      'heatmap_legend',
      {
        isVisible: state.legend.isVisible,
        position: state.legend.position,
        legendSize: state.legend.legendSize,
      }
    );

    const gridConfigFn = buildExpressionFunction<HeatmapGridExpressionFunctionDefinition>(
      'heatmap_grid',
      {
        // grid
        strokeWidth: state.gridConfig.strokeWidth,
        strokeColor: state.gridConfig.strokeColor,
        // cells
        isCellLabelVisible: state.gridConfig.isCellLabelVisible,
        // Y-axis
        isYAxisLabelVisible: state.gridConfig.isYAxisLabelVisible,
        isYAxisTitleVisible: state.gridConfig.isYAxisTitleVisible ?? false,
        yTitle: state.gridConfig.yTitle,
        // X-axis
        isXAxisLabelVisible: state.gridConfig.isXAxisLabelVisible,
        isXAxisTitleVisible: state.gridConfig.isXAxisTitleVisible ?? false,
        xTitle: state.gridConfig.xTitle,
      }
    );

    const heatmapFn = buildExpressionFunction<HeatmapExpressionFunctionDefinition>('heatmap', {
      xAccessor: state.xAccessor ?? '',
      yAccessor: state.yAccessor ?? '',
      valueAccessor: state.valueAccessor ?? '',
      lastRangeIsRightOpen: state.palette?.params?.continuity
        ? ['above', 'all'].includes(state.palette.params.continuity)
        : true,
      palette: state.palette?.params
        ? paletteService
            .get(CUSTOM_PALETTE)
            .toExpression(computePaletteParams(state.palette?.params))
        : paletteService.get(DEFAULT_PALETTE_NAME).toExpression(),
      legend: buildExpression([legendFn]),
      gridConfig: buildExpression([gridConfigFn]),
    });

    return {
      type: 'expression',
      chain: [...(datasourceExpression?.chain ?? []), heatmapFn.toAst()],
    };
  },

  toPreviewExpression(state, datasourceLayers, datasourceExpressionsByLayers = {}): Ast | null {
    const datasource = datasourceLayers[state.layerId];
    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

    const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

    if (!originalOrder || !state.valueAccessor) {
      return null;
    }

    const legendFn = buildExpressionFunction<HeatmapLegendExpressionFunctionDefinition>(
      'heatmap_legend',
      {
        isVisible: false,
        position: 'right',
      }
    );

    const gridConfigFn = buildExpressionFunction<HeatmapGridExpressionFunctionDefinition>(
      'heatmap_grid',
      {
        // grid
        strokeWidth: 1,
        // cells
        isCellLabelVisible: false,
        // Y-axis
        isYAxisLabelVisible: false,
        isYAxisTitleVisible: false,
        yTitle: state.gridConfig.yTitle,
        // X-axis
        isXAxisLabelVisible: false,
        isXAxisTitleVisible: false,
        xTitle: state.gridConfig.xTitle,
      }
    );

    const heatmapFn = buildExpressionFunction<HeatmapExpressionFunctionDefinition>('heatmap', {
      xAccessor: state.xAccessor ?? '',
      yAccessor: state.yAccessor ?? '',
      valueAccessor: state.valueAccessor ?? '',
      legend: buildExpression([legendFn]),
      gridConfig: buildExpression([gridConfigFn]),
      palette: state.palette?.params
        ? paletteService
            .get(CUSTOM_PALETTE)
            .toExpression(computePaletteParams(state.palette?.params))
        : paletteService.get(DEFAULT_PALETTE_NAME).toExpression(),
    });

    return {
      type: 'expression',
      chain: [...(datasourceExpression?.chain ?? []), heatmapFn.toAst()],
    };
  },

  getUserMessages(state, { frame }) {
    if (!state.yAccessor && !state.xAccessor && !state.valueAccessor) {
      // nothing configured yet
      return [];
    }

    const errors: UserMessage[] = [];

    if (!state.xAccessor) {
      errors.push({
        uniqueId: HEATMAP_X_MISSING_AXIS,
        severity: 'error',
        fixableInEditor: true,
        displayLocations: [{ id: 'visualization' }],
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

    let warnings: UserMessage[] = [];

    if (state?.layerId && frame.activeData && state.valueAccessor) {
      const rows = frame.activeData[state.layerId] && frame.activeData[state.layerId].rows;
      if (rows) {
        const hasArrayValues = rows.some((row) => Array.isArray(row[state.valueAccessor!]));

        const datasource = frame.datasourceLayers[state.layerId];
        const operation = datasource?.getOperationForColumnId(state.valueAccessor);

        warnings = hasArrayValues
          ? [
              {
                uniqueId: HEATMAP_RENDER_ARRAY_VALUES,
                severity: 'warning',
                fixableInEditor: true,
                displayLocations: [{ id: 'toolbar' }],
                shortMessage: '',
                longMessage: (
                  <FormattedMessage
                    id="xpack.lens.heatmapVisualization.arrayValuesWarningMessage"
                    defaultMessage="{label} contains array values. Your visualization may not render as expected."
                    values={{ label: <strong>{operation?.label}</strong> }}
                  />
                ),
              },
            ]
          : [];
      }
    }

    return [...errors, ...warnings];
  },

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<HeatmapVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<HeatmapVisualizationState, FormBasedPersistedState> = {
      ...allSuggestions[0],
      datasourceState: {
        ...allSuggestions[0].datasourceState,
        layers: allSuggestions.reduce(
          (acc, s) => ({
            ...acc,
            ...s.datasourceState?.layers,
          }),
          {}
        ),
      },
      visualizationState: {
        ...allSuggestions[0].visualizationState,
        ...(context.configuration as HeatmapConfiguration),
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state, frame) {
    const dimensions = [];
    if (state.xAccessor) {
      dimensions.push({
        id: state.xAccessor,
        name: getAxisName(GROUP_ID.X),
        dimensionType: 'x',
      });
    }

    if (state.yAccessor) {
      dimensions.push({
        id: state.yAccessor,
        name: getAxisName(GROUP_ID.Y),
        dimensionType: 'y',
      });
    }

    if (state.valueAccessor) {
      dimensions.push({
        id: state.valueAccessor,
        name: i18n.translate('xpack.lens.heatmap.cellValueLabel', {
          defaultMessage: 'Cell value',
        }),
        dimensionType: 'value',
      });
    }

    const { displayStops } = getSafePaletteParams(
      paletteService,
      // When the active data comes from the embeddable side it might not have been indexed by layerId
      // rather using a "default" key
      frame?.activeData?.[state.layerId] || frame?.activeData?.default,
      state.valueAccessor,
      state?.palette && state.palette.accessor === state.valueAccessor ? state.palette : undefined
    );

    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: state.shape,
          ...this.getDescription(state),
          dimensions,
          palette: displayStops.length ? displayStops.map(({ color }) => color) : undefined,
        },
      ],
    };
  },
});
