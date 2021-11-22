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
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type {
  Visualization,
  OperationMetadata,
  AccessorConfig,
  VisualizationDimensionGroupConfig,
} from '../types';
import { toExpression, toPreviewExpression } from './to_expression';
import type { PieLayerState, PieVisualizationState } from '../../common/expressions';
import { layerTypes } from '../../common';
import { suggestions } from './suggestions';
import { CHART_NAMES, MAX_PIE_BUCKETS, MAX_TREEMAP_BUCKETS } from './constants';
import { DimensionEditor, PieToolbar } from './toolbar';

function newLayerState(layerId: string): PieLayerState {
  return {
    layerId,
    groups: [],
    metric: undefined,
    numberDisplay: 'percent',
    categoryDisplay: 'default',
    legendDisplay: 'default',
    nestedLegend: false,
    layerType: layerTypes.DATA,
  };
}

const bucketedOperations = (op: OperationMetadata) => op.isBucketed;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

const applyPaletteToColumnConfig = (
  columns: AccessorConfig[],
  { shape, palette }: PieVisualizationState,
  paletteService: PaletteRegistry
) => {
  const colorPickerIndex = shape === 'mosaic' ? columns.length - 1 : 0;

  if (colorPickerIndex >= 0) {
    columns[colorPickerIndex] = {
      columnId: columns[colorPickerIndex].columnId,
      triggerIcon: 'colorBy',
      palette: paletteService
        .get(palette?.name || 'default')
        .getCategoricalColors(10, palette?.params),
    };
  }
};

export const getPieVisualization = ({
  paletteService,
}: {
  paletteService: PaletteRegistry;
}): Visualization<PieVisualizationState> => ({
  id: 'lnsPie',

  visualizationTypes: [
    {
      id: 'donut',
      icon: CHART_NAMES.donut.icon,
      label: CHART_NAMES.donut.label,
      groupLabel: CHART_NAMES.donut.groupLabel,
    },
    {
      id: 'pie',
      icon: CHART_NAMES.pie.icon,
      label: CHART_NAMES.pie.label,
      groupLabel: CHART_NAMES.pie.groupLabel,
    },
    {
      id: 'treemap',
      icon: CHART_NAMES.treemap.icon,
      label: CHART_NAMES.treemap.label,
      groupLabel: CHART_NAMES.treemap.groupLabel,
    },
    {
      id: 'mosaic',
      icon: CHART_NAMES.mosaic.icon,
      label: CHART_NAMES.mosaic.label,
      showExperimentalBadge: true,
      groupLabel: CHART_NAMES.mosaic.groupLabel,
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
    return CHART_NAMES[state.shape] ?? CHART_NAMES.pie;
  },

  switchVisualizationType: (visualizationTypeId, state) => ({
    ...state,
    shape: visualizationTypeId as PieVisualizationState['shape'],
  }),

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        shape: 'donut',
        layers: [newLayerState(addNewLayer())],
        palette: mainPalette,
      }
    );
  },

  getMainPalette: (state) => (state ? state.palette : undefined),

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
    const sortedColumns: AccessorConfig[] = Array.from(
      new Set(originalOrder.concat(layer.groups))
    ).map((accessor) => ({ columnId: accessor }));

    if (sortedColumns.length) {
      applyPaletteToColumnConfig(sortedColumns, state, paletteService);
    }

    const getSliceByGroup = (): VisualizationDimensionGroupConfig => {
      const baseProps = {
        required: true,
        groupId: 'groups',
        accessors: sortedColumns,
        enableDimensionEditor: true,
        filterOperations: bucketedOperations,
      };

      switch (state.shape) {
        case 'mosaic':
        case 'treemap':
          return {
            ...baseProps,
            groupLabel: i18n.translate('xpack.lens.pie.treemapGroupLabel', {
              defaultMessage: 'Group by',
            }),
            supportsMoreColumns: sortedColumns.length < MAX_TREEMAP_BUCKETS,
            dataTestSubj: 'lnsPie_groupByDimensionPanel',
            requiredMinDimensionCount: state.shape === 'mosaic' ? 2 : undefined,
          };
        default:
          return {
            ...baseProps,
            groupLabel: i18n.translate('xpack.lens.pie.sliceGroupLabel', {
              defaultMessage: 'Slice by',
            }),
            supportsMoreColumns: sortedColumns.length < MAX_PIE_BUCKETS,
            dataTestSubj: 'lnsPie_sliceByDimensionPanel',
          };
      }
    };

    const getMetricGroup = (): VisualizationDimensionGroupConfig => ({
      groupId: 'metric',
      groupLabel: i18n.translate('xpack.lens.pie.groupsizeLabel', {
        defaultMessage: 'Size by',
      }),
      accessors: layer.metric ? [{ columnId: layer.metric }] : [],
      supportsMoreColumns: !layer.metric,
      filterOperations: numberMetricOperations,
      required: true,
      dataTestSubj: 'lnsPie_sizeByDimensionPanel',
    });

    return {
      groups: [getSliceByGroup(), getMetricGroup()],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    return {
      ...prevState,
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
  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <DimensionEditor {...props} paletteService={paletteService} />
      </I18nProvider>,
      domElement
    );
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.pie.addLayer', {
          defaultMessage: 'Add visualization layer',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    return state?.layers.find(({ layerId: id }) => id === layerId)?.layerType;
  },

  toExpression: (state, layers, attributes) =>
    toExpression(state, layers, paletteService, attributes),
  toPreviewExpression: (state, layers) => toPreviewExpression(state, layers, paletteService),

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <PieToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  getWarningMessages(state, frame) {
    if (state?.layers.length === 0 || !frame.activeData) {
      return;
    }

    const metricColumnsWithArrayValues = [];

    for (const layer of state.layers) {
      const { layerId, metric } = layer;
      const rows = frame.activeData[layerId] && frame.activeData[layerId].rows;
      if (!rows || !metric) {
        break;
      }
      const columnToLabel = frame.datasourceLayers[layerId].getOperationForColumnId(metric)?.label;

      const hasArrayValues = rows.some((row) => Array.isArray(row[metric]));
      if (hasArrayValues) {
        metricColumnsWithArrayValues.push(columnToLabel || metric);
      }
    }
    return metricColumnsWithArrayValues.map((label) => (
      <FormattedMessage
        key={label}
        id="xpack.lens.pie.arrayValues"
        defaultMessage="{label} contains array values. Your visualization may not render as
        expected."
        values={{
          label: <strong>{label}</strong>,
        }}
      />
    ));
  },

  getErrorMessages(state) {
    // not possible to break it?
    return undefined;
  },
});
