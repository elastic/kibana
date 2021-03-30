/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensIconChartBar } from '../assets/chart_bar';
import { PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { OperationMetadata, Visualization } from '../types';
import { HeatmapVisualizationState } from './types';
import { suggestions } from './suggestions';
import { CHART_NAMES, CHART_SHAPES, FUNCTION_NAME, GROUP_ID, LENS_HEATMAP_ID } from './constants';

const groupLabelForBar = i18n.translate('xpack.lens.heatmapVisualization.heatmapGroupLabel', {
  defaultMessage: 'Heatmap',
});

interface HeatmapVisualizationDeps {
  paletteService: PaletteRegistry;
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

const filterOperationsXAxis = (op: OperationMetadata) => isTime(op) || isBucketed(op);

const isTime = (op: OperationMetadata) => op.dataType === 'date';
const isBucketed = (op: OperationMetadata) => op.isBucketed && op.scale === 'ordinal';
const isNumericMetric = (op: OperationMetadata) => op.dataType === 'number';

export const getHeatmapVisualization = ({
  paletteService,
}: HeatmapVisualizationDeps): Visualization<HeatmapVisualizationState> => ({
  id: LENS_HEATMAP_ID,

  visualizationTypes: [
    {
      id: 'heatmap',
      icon: LensIconChartBar,
      label: i18n.translate('xpack.lens.heatmapVisualization.heatmapLabel', {
        defaultMessage: 'Heatmap',
      }),
      groupLabel: groupLabelForBar,
    },
  ],

  getVisualizationTypeId(state) {
    return state.shape;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  clearLayer(state) {
    return {
      ...state,
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
        shape: CHART_SHAPES.HEATMAP,
      }
    );
  },

  getSuggestions: suggestions,

  getConfiguration({ state, frame, layerId }) {
    const datasourceLayer = frame.datasourceLayers[layerId];

    const originalOrder = datasourceLayer.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order

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
          filterOperations: filterOperationsXAxis,
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsHeatmap_xDimensionPanel',
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.Y,
          groupLabel: getAxisName(GROUP_ID.Y),
          accessors: state.yAccessor ? [{ columnId: state.yAccessor }] : [],
          filterOperations: isBucketed,
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsHeatmap_yDimensionPanel',
          // enableDimensionEditor: true,
        },
        {
          layerId: state.layerId,
          groupId: GROUP_ID.CELL,
          groupLabel: i18n.translate('xpack.lens.heatmap.cellValueLabel', {
            defaultMessage: 'Cell value',
          }),
          accessors: state.valueAccessor ? [{ columnId: state.valueAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsHeatmap_cellPanel',
          // enableDimensionEditor: true,
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

  toExpression(state, datasourceLayers, attributes): Ast | null {
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
            title: [attributes?.title ?? ''],
            description: [attributes?.description ?? ''],
            xAccessor: [state.xAccessor],
            yAccessor: [state.yAccessor],
            valueAccessor: [state.valueAccessor],
          },
        },
      ],
    };
  },

  getErrorMessages(state) {
    // not possible to break it?
    return undefined;
  },
});
