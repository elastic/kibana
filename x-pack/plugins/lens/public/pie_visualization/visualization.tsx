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
import type { PaletteRegistry } from 'src/plugins/charts/public';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import type {
  Visualization,
  OperationMetadata,
  AccessorConfig,
  VisualizationDimensionGroupConfig,
} from '../types';
import { getSortedGroups, toExpression, toPreviewExpression } from './to_expression';
import { CategoryDisplay, layerTypes, LegendDisplay, NumberDisplay } from '../../common';
import { suggestions } from './suggestions';
import { PartitionChartsMeta } from './partition_charts_meta';
import { DimensionEditor, PieToolbar } from './toolbar';
import { checkTableForContainsSmallValues } from './render_helpers';
import { PieChartTypes, PieLayerState, PieVisualizationState } from '../../common';

function newLayerState(layerId: string): PieLayerState {
  return {
    layerId,
    groups: [],
    metric: undefined,
    numberDisplay: NumberDisplay.PERCENT,
    categoryDisplay: CategoryDisplay.DEFAULT,
    legendDisplay: LegendDisplay.DEFAULT,
    nestedLegend: false,
    layerType: layerTypes.DATA,
  };
}

const bucketedOperations = (op: OperationMetadata) => op.isBucketed;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number' && !op.isStaticValue;

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
  kibanaTheme,
}: {
  paletteService: PaletteRegistry;
  kibanaTheme: ThemeServiceStart;
}): Visualization<PieVisualizationState> => ({
  id: 'lnsPie',

  visualizationTypes: Object.entries(PartitionChartsMeta).map(([key, meta]) => ({
    id: key,
    icon: meta.icon,
    label: meta.label,
    groupLabel: meta.groupLabel,
    showExperimentalBadge: meta.isExperimental,
  })),

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
    return PartitionChartsMeta[state.shape] ?? PartitionChartsMeta.pie;
  },

  switchVisualizationType: (visualizationTypeId, state) => ({
    ...state,
    shape: visualizationTypeId as PieVisualizationState['shape'],
  }),

  triggers: [VIS_EVENT_TO_TRIGGER.filter],

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        shape: PieChartTypes.DONUT,
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
    const originalOrder = getSortedGroups(datasource, layer);
    // When we add a column it could be empty, and therefore have no order
    const sortedColumns: AccessorConfig[] = originalOrder.map((accessor) => ({
      columnId: accessor,
    }));

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
        case 'donut':
        case 'pie':
          return {
            ...baseProps,
            groupLabel: i18n.translate('xpack.lens.pie.sliceGroupLabel', {
              defaultMessage: 'Slice by',
            }),
            supportsMoreColumns: sortedColumns.length < PartitionChartsMeta.pie.maxBuckets,
            dataTestSubj: 'lnsPie_sliceByDimensionPanel',
          };
        default:
          return {
            ...baseProps,
            groupLabel: i18n.translate('xpack.lens.pie.treemapGroupLabel', {
              defaultMessage: 'Group by',
            }),
            supportsMoreColumns: sortedColumns.length < PartitionChartsMeta[state.shape].maxBuckets,
            dataTestSubj: 'lnsPie_groupByDimensionPanel',
            requiredMinDimensionCount: PartitionChartsMeta[state.shape].requiredMinDimensionCount,
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
          return { ...l, groups: [...l.groups.filter((group) => group !== columnId), columnId] };
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
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <DimensionEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.pie.addLayer', {
          defaultMessage: 'Visualization',
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
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <PieToolbar {...props} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getWarningMessages(state, frame) {
    if (state?.layers.length === 0 || !frame.activeData) {
      return;
    }
    const warningMessages = [];

    for (const layer of state.layers) {
      const { layerId, metric } = layer;
      const rows = frame.activeData[layerId]?.rows;
      const numericColumn = frame.activeData[layerId]?.columns.find(
        ({ meta }) => meta?.type === 'number'
      );

      if (!rows || !metric) {
        break;
      }

      if (
        numericColumn &&
        state.shape === 'waffle' &&
        layer.groups.length &&
        checkTableForContainsSmallValues(frame.activeData[layerId], numericColumn.id, 1)
      ) {
        warningMessages.push(
          <FormattedMessage
            id="xpack.lens.pie.smallValuesWarningMessage"
            defaultMessage="Waffle charts are unable to effectively display small field values. To display all field values, use the Data table or Treemap."
          />
        );
      }

      const columnToLabel = frame.datasourceLayers[layerId].getOperationForColumnId(metric)?.label;
      const hasArrayValues = rows.some((row) => Array.isArray(row[metric]));
      if (hasArrayValues) {
        warningMessages.push(
          <FormattedMessage
            key={columnToLabel || metric}
            id="xpack.lens.pie.arrayValues"
            defaultMessage="{label} contains array values. Your visualization may not render as
        expected."
            values={{
              label: <strong>{columnToLabel || metric}</strong>,
            }}
          />
        );
      }
    }

    return warningMessages;
  },

  getErrorMessages(state) {
    // not possible to break it?
    return undefined;
  },
});
