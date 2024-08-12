/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  PaletteRegistry,
  getColorsFromMapping,
} from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { PartitionVisConfiguration } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { AccessorConfig } from '@kbn/visualization-ui-components';
import useObservable from 'react-use/lib/useObservable';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import type {
  Visualization,
  OperationMetadata,
  VisualizationDimensionGroupConfig,
  Suggestion,
  VisualizeEditorContext,
  VisualizationInfo,
  UserMessage,
} from '../../types';
import {
  getColumnToLabelMap,
  getSortedAccessorsForGroup,
  toExpression,
  toPreviewExpression,
} from './to_expression';
import { PieLayerState, PieVisualizationState } from '../../../common/types';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
} from '../../../common/constants';
import { suggestions } from './suggestions';
import { PartitionChartsMeta } from './partition_charts_meta';
import { PieToolbar } from './toolbar';
import { DimensionDataExtraEditor, DimensionEditor } from './dimension_editor';
import { LayerSettings } from './layer_settings';
import { checkTableForContainsSmallValues } from './render_helpers';
import { DatasourcePublicAPI } from '../..';
import { nonNullable, getColorMappingDefaults } from '../../utils';
import { getColorMappingTelemetryEvents } from '../../lens_ui_telemetry/color_telemetry_helpers';
import { PersistedPieVisualizationState, convertToRuntime } from './persistence';
import {
  PIE_RENDER_ARRAY_VALUES,
  PIE_TOO_MANY_DIMENSIONS,
  WAFFLE_SMALL_VALUES,
} from '../../user_messages_ids';

const metricLabel = i18n.translate('xpack.lens.pie.groupMetricLabelSingular', {
  defaultMessage: 'Metric',
});

function newLayerState(layerId: string, colorMapping?: ColorMapping.Config): PieLayerState {
  return {
    layerId,
    primaryGroups: [],
    secondaryGroups: undefined,
    metrics: [],
    numberDisplay: NumberDisplay.PERCENT,
    categoryDisplay: CategoryDisplay.DEFAULT,
    legendDisplay: LegendDisplay.DEFAULT,
    nestedLegend: false,
    layerType: LayerTypes.DATA,
    colorMapping,
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

export const hasNonCollapsedSliceBy = (l: PieLayerState) => {
  const sliceByLength = l.primaryGroups.length;
  const collapsedGroupsLength =
    (l.collapseFns && Object.values(l.collapseFns).filter(Boolean).length) ?? 0;
  return sliceByLength - collapsedGroupsLength > 0;
};

export const getDefaultColorForMultiMetricDimension = ({
  layer,
  columnId,
  paletteService,
  datasource,
  palette,
}: {
  layer: PieLayerState;
  columnId: string;
  paletteService: PaletteRegistry;
  datasource: DatasourcePublicAPI | undefined;
  palette?: PieVisualizationState['palette'];
}) => {
  const columnToLabelMap = datasource ? getColumnToLabelMap(layer.metrics, datasource) : {};
  const sortedMetrics = getSortedAccessorsForGroup(datasource, layer, 'metrics');
  return paletteService.get(palette?.name || 'default').getCategoricalColor([
    {
      name: columnToLabelMap[columnId],
      rankAtDepth: sortedMetrics.indexOf(columnId),
      totalSeriesAtDepth: sortedMetrics.length,
    },
  ]) as string;
};

export const getPieVisualization = ({
  paletteService,
  kibanaTheme,
}: {
  paletteService: PaletteRegistry;
  kibanaTheme: ThemeServiceStart;
}): Visualization<PieVisualizationState, PersistedPieVisualizationState> => ({
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
      layers: state.layers.map((l) =>
        newLayerState(l.layerId, { ...DEFAULT_COLOR_MAPPING_CONFIG })
      ),
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
    if (state) {
      return convertToRuntime(state);
    }
    return {
      shape: PieChartTypes.DONUT,
      layers: [
        newLayerState(
          addNewLayer(),
          mainPalette?.type === 'colorMapping' ? mainPalette.value : getColorMappingDefaults()
        ),
      ],
      palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : undefined,
    };
  },

  getMainPalette: (state) => {
    if (!state) {
      return undefined;
    }
    return state.layers.length > 0 && state.layers[0].colorMapping
      ? { type: 'colorMapping', value: state.layers[0].colorMapping }
      : state.palette
      ? { type: 'legacyPalette', value: state.palette }
      : undefined;
  },

  getSuggestions: suggestions,

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];

    let colors: string[] = [];
    kibanaTheme.theme$
      .subscribe({
        next(theme) {
          colors = state.layers[0]?.colorMapping
            ? getColorsFromMapping(theme.darkMode, state.layers[0].colorMapping)
            : paletteService
                .get(state.palette?.name || 'default')
                .getCategoricalColors(10, state.palette?.params);
        },
      })
      .unsubscribe();

    const getPrimaryGroupConfig = (): VisualizationDimensionGroupConfig => {
      const originalOrder = getSortedAccessorsForGroup(datasource, layer, 'primaryGroups');
      // When we add a column it could be empty, and therefore have no order
      const accessors = originalOrder.map<AccessorConfig>((accessor) => ({
        columnId: accessor,
        triggerIconType: isCollapsed(accessor, layer) ? 'aggregate' : undefined,
      }));

      const firstNonCollapsedColumnId = layer.primaryGroups.find((id) => !isCollapsed(id, layer));

      accessors.forEach((accessorConfig) => {
        if (firstNonCollapsedColumnId === accessorConfig.columnId) {
          accessorConfig.triggerIconType = 'colorBy';
          accessorConfig.palette = colors;
        }
      });

      const primaryGroupConfigBaseProps = {
        groupId: 'primaryGroups',
        accessors,
        enableDimensionEditor: true,
        filterOperations: bucketedOperations,
      };

      // We count multiple metrics as a bucket dimension.
      //
      // However, if this is a mosaic chart, we don't support multiple metrics
      // so if there is more than one metric we got here via a chart switch from
      // a subtype that supports multi-metrics e.g. pie.
      //
      // The user will be prompted to remove the extra metric dimensions and we don't
      // count multiple metrics as a bucket dimension so that the rest of the dimension
      // groups UI behaves correctly.
      const multiMetricsBucketDimensionCount =
        layer.metrics.length > 1 && state.shape !== PieChartTypes.MOSAIC ? 1 : 0;

      const totalNonCollapsedAccessors =
        accessors.reduce(
          (total, { columnId }) => total + (isCollapsed(columnId, layer) ? 0 : 1),
          0
        ) + multiMetricsBucketDimensionCount;

      const fakeFinalAccessor =
        layer.metrics.length > 1 && layer.allowMultipleMetrics
          ? {
              label: i18n.translate('xpack.lens.pie.multiMetricAccessorLabel', {
                defaultMessage: '{number} metrics',
                values: {
                  number: layer.metrics.length,
                },
              }),
            }
          : undefined;

      switch (state.shape) {
        case PieChartTypes.DONUT:
        case PieChartTypes.PIE:
          return {
            ...primaryGroupConfigBaseProps,
            groupLabel: i18n.translate('xpack.lens.pie.sliceGroupLabel', {
              defaultMessage: 'Slice by',
            }),
            dimensionEditorGroupLabel: i18n.translate('xpack.lens.pie.sliceDimensionGroupLabel', {
              defaultMessage: 'Slice',
            }),
            fakeFinalAccessor,
            supportsMoreColumns: totalNonCollapsedAccessors < PartitionChartsMeta.pie.maxBuckets,
            dimensionsTooMany: totalNonCollapsedAccessors - PartitionChartsMeta.pie.maxBuckets,
            dataTestSubj: 'lnsPie_sliceByDimensionPanel',
            hideGrouping: true,
          };
        case PieChartTypes.MOSAIC:
          return {
            ...primaryGroupConfigBaseProps,
            requiredMinDimensionCount: 1,
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
            fakeFinalAccessor,
            supportsMoreColumns:
              totalNonCollapsedAccessors < PartitionChartsMeta[state.shape].maxBuckets,
            dimensionsTooMany:
              totalNonCollapsedAccessors - PartitionChartsMeta[state.shape].maxBuckets,
            dataTestSubj: 'lnsPie_groupByDimensionPanel',
            hideGrouping: state.shape === PieChartTypes.TREEMAP,
          };
      }
    };

    const getSecondaryGroupConfig = (): VisualizationDimensionGroupConfig | undefined => {
      const originalSecondaryOrder = getSortedAccessorsForGroup(
        datasource,
        layer,
        'secondaryGroups'
      );
      const accessors = originalSecondaryOrder.map<AccessorConfig>((accessor) => ({
        columnId: accessor,
        triggerIconType: isCollapsed(accessor, layer) ? 'aggregate' : undefined,
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
        case PieChartTypes.MOSAIC:
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

    const getMetricGroupConfig = (): VisualizationDimensionGroupConfig => {
      const accessors: AccessorConfig[] = getSortedAccessorsForGroup(
        datasource,
        layer,
        'metrics'
      ).map<AccessorConfig>((columnId) => ({
        columnId,
        ...(layer.allowMultipleMetrics
          ? hasNonCollapsedSliceBy(layer)
            ? {
                triggerIconType: 'disabled',
              }
            : {
                triggerIconType: 'color',
                color:
                  layer.colorsByDimension?.[columnId] ??
                  getDefaultColorForMultiMetricDimension({
                    layer,
                    columnId,
                    paletteService,
                    datasource,
                    palette: state.palette,
                  }) ??
                  undefined,
              }
          : {}),
      }));

      const groupLabel = layer.allowMultipleMetrics
        ? i18n.translate('xpack.lens.pie.groupMetricLabel', {
            defaultMessage: 'Metrics',
          })
        : metricLabel;

      return {
        groupId: 'metric',
        groupLabel,
        dimensionEditorGroupLabel: groupLabel,
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.pie.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors,
        supportsMoreColumns: layer.metrics.length === 0 || Boolean(layer.allowMultipleMetrics),
        filterOperations: numberMetricOperations,
        isMetricDimension: true,
        requiredMinDimensionCount: 1,
        dimensionsTooMany: layer.allowMultipleMetrics ? 0 : layer.metrics.length - 1,
        dataTestSubj: 'lnsPie_sizeByDimensionPanel',
        enableDimensionEditor: true,
      };
    };

    return {
      groups: [getPrimaryGroupConfig(), getSecondaryGroupConfig(), getMetricGroupConfig()].filter(
        nonNullable
      ),
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
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
        const metrics = [...l.metrics.filter((metric) => metric !== columnId), columnId];
        return { ...l, metrics };
      }),
    };
  },
  removeDimension({ prevState, layerId, columnId }) {
    const newState = { ...prevState };

    const layerToChange = prevState.layers.find((l) => l.layerId === layerId);

    if (!layerToChange) {
      return prevState;
    }

    if (
      layerToChange.primaryGroups.includes(columnId) &&
      layerToChange.primaryGroups.length === 1 &&
      layerToChange.allowMultipleMetrics &&
      layerToChange.metrics.length
    ) {
      // we don't support palette selection for multiple metrics without a slice-by dimension
      // so revert to default if the last slice-by is removed
      delete newState.palette;
    }

    let newLayer = { ...layerToChange };

    if (layerToChange.collapseFns?.[columnId]) {
      newLayer.collapseFns = { ...layerToChange.collapseFns };
      delete newLayer.collapseFns[columnId];
    }

    if (layerToChange.colorsByDimension?.[columnId]) {
      newLayer.colorsByDimension = { ...layerToChange.colorsByDimension };
      delete newLayer.colorsByDimension[columnId];
    }

    newLayer = {
      ...newLayer,
      primaryGroups: newLayer.primaryGroups.filter((c) => c !== columnId),
      secondaryGroups: newLayer.secondaryGroups?.filter((c) => c !== columnId) ?? undefined,
      metrics: newLayer.metrics.filter((c) => c !== columnId),
    };

    return {
      ...newState,
      layers: newState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },
  DimensionEditorComponent(props) {
    const isDarkMode = useObservable(kibanaTheme.theme$, { darkMode: false }).darkMode;
    return <DimensionEditor {...props} paletteService={paletteService} isDarkMode={isDarkMode} />;
  },
  DimensionEditorDataExtraComponent(props) {
    return <DimensionDataExtraEditor {...props} paletteService={paletteService} />;
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

  ToolbarComponent(props) {
    return <PieToolbar {...props} />;
  },

  hasLayerSettings(props) {
    return { data: props.state.shape !== PieChartTypes.MOSAIC, appearance: false };
  },

  LayerSettingsComponent(props) {
    return <LayerSettings {...props} />;
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

  getUserMessages(state, { frame }) {
    const hasTooManyBucketDimensions = state.layers
      .map((layer) => {
        const totalBucketDimensions =
          Array.from(new Set([...layer.primaryGroups, ...(layer.secondaryGroups ?? [])])).filter(
            (columnId) => !isCollapsed(columnId, layer)
          ).length +
          // multiple metrics counts as a dimension
          (layer.metrics.length > 1 ? 1 : 0);
        return totalBucketDimensions > PartitionChartsMeta[state.shape].maxBuckets;
      })
      .some(Boolean);

    const errors: UserMessage[] = hasTooManyBucketDimensions
      ? [
          {
            uniqueId: PIE_TOO_MANY_DIMENSIONS,
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [{ id: 'visualization' }],
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

    const warningMessages: UserMessage[] = [];
    if (state?.layers.length > 0 && frame.activeData) {
      for (const layer of state.layers) {
        const { layerId, metrics } = layer;
        const rows = frame.activeData[layerId]?.rows;
        const numericColumn = frame.activeData[layerId]?.columns.find(
          ({ meta }) => meta?.type === 'number'
        );

        if (!rows || !metrics.length) {
          break;
        }

        if (
          numericColumn &&
          state.shape === PieChartTypes.WAFFLE &&
          layer.primaryGroups.length &&
          checkTableForContainsSmallValues(frame.activeData[layerId], numericColumn.id, 1)
        ) {
          warningMessages.push({
            uniqueId: WAFFLE_SMALL_VALUES,
            severity: 'warning',
            fixableInEditor: true,
            displayLocations: [{ id: 'toolbar' }],
            shortMessage: '',
            longMessage: (
              <FormattedMessage
                id="xpack.lens.pie.smallValuesWarningMessage"
                defaultMessage="Waffle charts are unable to effectively display small field values. To display all field values, use the Data table or Treemap."
              />
            ),
          });
        }

        const metricsWithArrayValues = metrics
          .map((metricColId) => {
            if (rows.some((row) => Array.isArray(row[metricColId]))) {
              return metricColId;
            }
          })
          .filter(nonNullable);

        if (metricsWithArrayValues.length) {
          const labels = metricsWithArrayValues.map(
            (colId) =>
              frame.datasourceLayers[layerId]?.getOperationForColumnId(colId)?.label || colId
          );
          warningMessages.push({
            uniqueId: PIE_RENDER_ARRAY_VALUES,
            severity: 'warning',
            fixableInEditor: true,
            displayLocations: [{ id: 'toolbar' }],
            shortMessage: '',
            longMessage: (
              <FormattedMessage
                key={labels.join(',')}
                id="xpack.lens.pie.arrayValues"
                defaultMessage="The following dimensions contain array values: {label}. Your visualization may not render as
          expected."
                values={{
                  label: <strong>{labels.join(', ')}</strong>,
                }}
              />
            ),
          });
        }
      }
    }

    return [...errors, ...warningMessages];
  },

  getVisualizationInfo(state, frame) {
    const layer = state.layers[0];
    const dimensions: VisualizationInfo['layers'][number]['dimensions'] = [];

    const datasource = frame?.datasourceLayers[layer.layerId];
    const hasSliceBy = layer.primaryGroups.length + (layer.secondaryGroups?.length || 0);
    const hasMultipleMetrics = layer.allowMultipleMetrics;
    const palette = [];

    if (!hasSliceBy && datasource) {
      if (hasMultipleMetrics) {
        palette.push(
          ...layer.metrics.map(
            (columnId) =>
              layer.colorsByDimension?.[columnId] ??
              getDefaultColorForMultiMetricDimension({
                layer,
                columnId,
                paletteService,
                datasource,
                palette: state.palette,
              })
          )
        );
      } else if (!hasNonCollapsedSliceBy(layer)) {
        // This is a logic integrated in the renderer, here simulated
        // In the particular case of no color assigned (as no sliceBy dimension defined)
        // the color is generated on the fly from the default palette
        palette.push(
          ...paletteService
            .get(state.palette?.name || 'default')
            .getCategoricalColors(Math.max(10, layer.metrics.length))
            .slice(0, layer.metrics.length)
        );
      }
    }

    layer.metrics.forEach((metric) => {
      dimensions.push({
        id: metric,
        name: metricLabel,
        dimensionType: 'metric',
      });
    });

    if (state.shape === PieChartTypes.MOSAIC && layer.secondaryGroups?.length) {
      layer.secondaryGroups.forEach((accessor) => {
        dimensions.push({
          name: i18n.translate('xpack.lens.pie.horizontalAxisLabel', {
            defaultMessage: 'Horizontal axis',
          }),
          dimensionType: 'horizontal_axis',
          id: accessor,
        });
      });
    }

    if (layer.primaryGroups?.length) {
      let name = i18n.translate('xpack.lens.pie.treemapGroupLabel', {
        defaultMessage: 'Group by',
      });
      let dimensionType = 'group_by';

      if (state.shape === PieChartTypes.MOSAIC) {
        name = i18n.translate('xpack.lens.pie.verticalAxisLabel', {
          defaultMessage: 'Vertical axis',
        });
        dimensionType = 'vertical_axis';
      }
      if (state.shape === PieChartTypes.DONUT || state.shape === PieChartTypes.PIE) {
        name = i18n.translate('xpack.lens.pie.sliceGroupLabel', {
          defaultMessage: 'Slice by',
        });
        dimensionType = 'slice_by';
      }
      layer.primaryGroups.forEach((accessor) => {
        dimensions.push({
          name,
          dimensionType,
          id: accessor,
        });
      });

      if (hasNonCollapsedSliceBy(layer)) {
        palette.push(
          ...paletteService
            .get(state.palette?.name || 'default')
            .getCategoricalColors(10, state.palette?.params)
        );
      }
    }

    const finalPalette = palette.filter(nonNullable);

    return {
      layers: [
        {
          layerId: layer.layerId,
          layerType: layer.layerType,
          chartType: state.shape,
          ...this.getDescription(state),
          dimensions,
          palette: finalPalette.length ? finalPalette : undefined,
        },
      ],
    };
  },

  getTelemetryEventsOnSave(state, prevState) {
    return getColorMappingTelemetryEvents(
      state?.layers[0]?.colorMapping,
      prevState?.layers[0]?.colorMapping
    );
  },
});
