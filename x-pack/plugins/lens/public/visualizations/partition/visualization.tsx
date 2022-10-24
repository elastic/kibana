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
import type { PaletteRegistry } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { PartitionVisConfiguration } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import type {
  Visualization,
  OperationMetadata,
  AccessorConfig,
  VisualizationDimensionGroupConfig,
  Suggestion,
  VisualizeEditorContext,
} from '../../types';
import { getSortedGroups, toExpression, toPreviewExpression } from './to_expression';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
  PieLayerState,
  PieVisualizationState,
} from '../../../common';
import { suggestions } from './suggestions';
import { PartitionChartsMeta } from './partition_charts_meta';
import { DimensionEditor, PieToolbar } from './toolbar';
import { checkTableForContainsSmallValues } from './render_helpers';

function newLayerState(layerId: string): PieLayerState {
  return {
    layerId,
    primaryGroups: [],
    secondaryGroups: undefined,
    metric: undefined,
    numberDisplay: NumberDisplay.PERCENT,
    categoryDisplay: CategoryDisplay.DEFAULT,
    legendDisplay: LegendDisplay.DEFAULT,
    nestedLegend: false,
    layerType: LayerTypes.DATA,
  };
}

function isPartitionVisConfiguration(
  context: VisualizeEditorContext
): context is VisualizeEditorContext<PartitionVisConfiguration> {
  return context.type === 'lnsPie';
}

const bucketedOperations = (op: OperationMetadata) => op.isBucketed;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number' && !op.isStaticValue;

export const isCollapsed = (columnId: string, layer: PieLayerState) =>
  Boolean(layer.collapseFns?.[columnId]);

const applyPaletteToColumnConfig = (
  columns: AccessorConfig[],
  layer: PieLayerState,
  palette: PieVisualizationState['palette'],
  paletteService: PaletteRegistry
) => {
  const firstNonCollapsedColumnIdx = columns.findIndex(
    (column) => !isCollapsed(column.columnId, layer)
  );

  if (firstNonCollapsedColumnIdx > -1) {
    columns[firstNonCollapsedColumnIdx] = {
      columnId: columns[firstNonCollapsedColumnIdx].columnId,
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

    const getPrimaryGroupConfig = (): VisualizationDimensionGroupConfig => {
      const originalOrder = getSortedGroups(datasource, layer);
      // When we add a column it could be empty, and therefore have no order
      const accessors: AccessorConfig[] = originalOrder.map((accessor) => ({
        columnId: accessor,
        triggerIcon: isCollapsed(accessor, layer) ? ('aggregate' as const) : undefined,
      }));

      if (accessors.length) {
        applyPaletteToColumnConfig(accessors, layer, state.palette, paletteService);
      }

      const primaryGroupConfigBaseProps = {
        requiredMinDimensionCount: 1,
        groupId: 'primaryGroups',
        accessors,
        enableDimensionEditor: true,
        filterOperations: bucketedOperations,
      };

      const totalNonCollapsedAccessors = accessors.reduce(
        (total, { columnId }) => total + (isCollapsed(columnId, layer) ? 0 : 1),
        0
      );

      switch (state.shape) {
        case 'donut':
        case 'pie':
          return {
            ...primaryGroupConfigBaseProps,
            groupLabel: i18n.translate('xpack.lens.pie.sliceGroupLabel', {
              defaultMessage: 'Slice by',
            }),
            dimensionEditorGroupLabel: i18n.translate('xpack.lens.pie.sliceDimensionGroupLabel', {
              defaultMessage: 'Slice',
            }),
            supportsMoreColumns: totalNonCollapsedAccessors < PartitionChartsMeta.pie.maxBuckets,
            dimensionsTooMany: totalNonCollapsedAccessors - PartitionChartsMeta.pie.maxBuckets,
            dataTestSubj: 'lnsPie_sliceByDimensionPanel',
            hideGrouping: true,
          };
        case 'mosaic':
          return {
            ...primaryGroupConfigBaseProps,
            groupLabel: i18n.translate('xpack.lens.pie.verticalAxisLabel', {
              defaultMessage: 'Vertical axis',
            }),
            dimensionEditorGroupLabel: i18n.translate('xpack.lens.pie.verticalAxisDimensionLabel', {
              defaultMessage: 'Vertical axis',
            }),
            supportsMoreColumns: totalNonCollapsedAccessors === 0,
            dimensionsTooMany: totalNonCollapsedAccessors - 1,
            dataTestSubj: 'lnsPie_verticalAxisDimensionPanel',
          };
        default:
          return {
            ...primaryGroupConfigBaseProps,
            groupLabel: i18n.translate('xpack.lens.pie.treemapGroupLabel', {
              defaultMessage: 'Group by',
            }),
            dimensionEditorGroupLabel: i18n.translate('xpack.lens.pie.treemapDimensionGroupLabel', {
              defaultMessage: 'Group',
            }),
            supportsMoreColumns:
              totalNonCollapsedAccessors < PartitionChartsMeta[state.shape].maxBuckets,
            dimensionsTooMany:
              totalNonCollapsedAccessors - PartitionChartsMeta[state.shape].maxBuckets,
            dataTestSubj: 'lnsPie_groupByDimensionPanel',
            hideGrouping: state.shape === 'treemap',
          };
      }
    };

    const getSecondaryGroupConfig = (): VisualizationDimensionGroupConfig | undefined => {
      const originalSecondaryOrder = getSortedGroups(datasource, layer, 'secondaryGroups');
      const accessors = originalSecondaryOrder.map((accessor) => ({
        columnId: accessor,
        triggerIcon: isCollapsed(accessor, layer) ? ('aggregate' as const) : undefined,
      }));

      const secondaryGroupConfigBaseProps = {
        required: true,
        groupId: 'secondaryGroups',
        accessors,
        enableDimensionEditor: true,
        filterOperations: bucketedOperations,
      };

      const totalNonCollapsedAccessors = accessors.reduce(
        (total, { columnId }) => total + (isCollapsed(columnId, layer) ? 0 : 1),
        0
      );

      switch (state.shape) {
        case 'mosaic':
          return {
            ...secondaryGroupConfigBaseProps,
            groupLabel: i18n.translate('xpack.lens.pie.horizontalAxisLabel', {
              defaultMessage: 'Horizontal axis',
            }),
            dimensionEditorGroupLabel: i18n.translate(
              'xpack.lens.pie.horizontalAxisDimensionLabel',
              {
                defaultMessage: 'Horizontal axis',
              }
            ),
            supportsMoreColumns: totalNonCollapsedAccessors === 0,
            dimensionsTooMany: totalNonCollapsedAccessors - 1,
            dataTestSubj: 'lnsPie_horizontalAxisDimensionPanel',
          };
        default:
          return undefined;
      }
    };

    const getMetricGroupConfig = (): VisualizationDimensionGroupConfig => ({
      groupId: 'metric',
      groupLabel: i18n.translate('xpack.lens.pie.groupsizeLabel', {
        defaultMessage: 'Size by',
      }),
      dimensionEditorGroupLabel: i18n.translate('xpack.lens.pie.groupSizeLabel', {
        defaultMessage: 'Size',
      }),
      paramEditorCustomProps: {
        headingLabel: i18n.translate('xpack.lens.pie.headingLabel', {
          defaultMessage: 'Value',
        }),
      },
      accessors: layer.metric ? [{ columnId: layer.metric }] : [],
      supportsMoreColumns: !layer.metric,
      filterOperations: numberMetricOperations,
      requiredMinDimensionCount: 1,
      dataTestSubj: 'lnsPie_sizeByDimensionPanel',
    });

    return {
      groups: [getPrimaryGroupConfig(), getSecondaryGroupConfig(), getMetricGroupConfig()].filter(
        Boolean
      ) as VisualizationDimensionGroupConfig[],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    return {
      ...prevState,
      layers: prevState.layers.map((l) => {
        if (l.layerId !== layerId) {
          return l;
        }
        if (groupId === 'primaryGroups') {
          return {
            ...l,
            primaryGroups: [...l.primaryGroups.filter((group) => group !== columnId), columnId],
          };
        }
        if (groupId === 'secondaryGroups') {
          return {
            ...l,
            secondaryGroups: [
              ...(l.secondaryGroups?.filter((group) => group !== columnId) || []),
              columnId,
            ],
          };
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

        const newLayer = { ...l };

        if (l.collapseFns?.[columnId]) {
          const newCollapseFns = { ...l.collapseFns };
          delete newCollapseFns[columnId];
          newLayer.collapseFns = newCollapseFns;
        }

        if (newLayer.metric === columnId) {
          return { ...newLayer, metric: undefined };
        }
        return {
          ...newLayer,
          primaryGroups: newLayer.primaryGroups.filter((c) => c !== columnId),
          secondaryGroups: newLayer.secondaryGroups?.filter((c) => c !== columnId) ?? undefined,
        };
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
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.pie.addLayer', {
          defaultMessage: 'Visualization',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    return state?.layers.find(({ layerId: id }) => id === layerId)?.layerType;
  },

  toExpression: (state, layers, attributes, datasourceExpressionsByLayers) =>
    toExpression(state, layers, paletteService, attributes, datasourceExpressionsByLayers),

  toPreviewExpression: (state, layers, datasourceExpressionsByLayers) =>
    toPreviewExpression(state, layers, paletteService, datasourceExpressionsByLayers),

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
        layer.primaryGroups.length &&
        checkTableForContainsSmallValues(frame.activeData[layerId], numericColumn.id, 1)
      ) {
        warningMessages.push(
          <FormattedMessage
            id="xpack.lens.pie.smallValuesWarningMessage"
            defaultMessage="Waffle charts are unable to effectively display small field values. To display all field values, use the Data table or Treemap."
          />
        );
      }

      const columnToLabel = frame.datasourceLayers[layerId]?.getOperationForColumnId(metric)?.label;
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

  getSuggestionFromConvertToLensContext(props) {
    const context = props.context;
    if (!isPartitionVisConfiguration(context)) {
      return;
    }
    if (!props.suggestions.length) {
      return;
    }
    const suggestionByShape = (
      props.suggestions as Array<Suggestion<PieVisualizationState, FormBasedPersistedState>>
    ).find((suggestion) => suggestion.visualizationState.shape === context.configuration.shape);
    if (!suggestionByShape) {
      return;
    }
    const suggestion: Suggestion<PieVisualizationState, FormBasedPersistedState> = {
      ...suggestionByShape,
      visualizationState: {
        ...suggestionByShape.visualizationState,
        ...context.configuration,
      },
    };
    return suggestion;
  },

  getErrorMessages(state) {
    const hasTooManyBucketDimensions = state.layers
      .map(
        (layer) =>
          Array.from(new Set([...layer.primaryGroups, ...(layer.secondaryGroups ?? [])])).filter(
            (columnId) => !isCollapsed(columnId, layer)
          ).length > PartitionChartsMeta[state.shape].maxBuckets
      )
      .some(Boolean);

    return hasTooManyBucketDimensions
      ? [
          {
            shortMessage: i18n.translate('xpack.lens.pie.tooManyDimensions', {
              defaultMessage: 'Your visualization has too many dimensions.',
            }),
            longMessage: (
              <span>
                {i18n.translate('xpack.lens.pie.tooManyDimensionsLong', {
                  defaultMessage:
                    'Your visualization has too many dimensions. Please follow the instructions in the layer panel.',
                })}
                <EuiSpacer size="s" />
                {i18n.translate('xpack.lens.pie.collapsedDimensionsDontCount', {
                  defaultMessage: "(Collapsed dimensions don't count toward this limit.)",
                })}
              </span>
            ),
          },
        ]
      : [];
  },
});
