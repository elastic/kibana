/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import { ScaleType } from '@elastic/charts';
import type { PaletteRegistry } from '@kbn/coloring';

import { EventAnnotationServiceType } from 'src/plugins/event_annotation/public';
import { ExpressionAstExpression } from 'src/plugins/expressions';
import {
  State,
  YConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYAnnotationLayerConfig,
} from './types';
import type { ValidXYDataLayerConfig } from './types';
import { OperationMetadata, DatasourcePublicAPI, DatasourceLayers } from '../types';
import { getColumnToLabelMap } from './state_helpers';
import type { YAxisConfig } from '../../../../../src/plugins/chart_expressions/expression_xy/common';
import { hasIcon } from './xy_config_panel/shared/icon_select';
import { defaultReferenceLineColor } from './color_assignment';
import { getDefaultVisualValuesForLayer } from '../shared_components/datasource_default_values';
import {
  getLayerTypeOptions,
  getDataLayers,
  getReferenceLayers,
  getAnnotationsLayers,
} from './visualization_helpers';
import { getUniqueLabels, defaultAnnotationLabel } from './annotations/helpers';
import { layerTypes } from '../../common';

export const getSortedAccessors = (
  datasource: DatasourcePublicAPI,
  layer: XYDataLayerConfig | XYReferenceLineLayerConfig
) => {
  const originalOrder = datasource
    ? datasource
        .getTableSpec()
        .map(({ columnId }: { columnId: string }) => columnId)
        .filter((columnId: string) => layer.accessors.includes(columnId))
    : layer.accessors;
  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder.concat(layer.accessors)));
};

export const toExpression = (
  state: State,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {},
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
): Ast | null => {
  if (!state || !state.layers.length) {
    return null;
  }

  const metadata: Record<string, Record<string, OperationMetadata | null>> = {};
  state.layers.forEach((layer) => {
    metadata[layer.layerId] = {};
    const datasource = datasourceLayers[layer.layerId];
    if (datasource) {
      datasource.getTableSpec().forEach((column) => {
        const operation = datasourceLayers[layer.layerId].getOperationForColumnId(column.columnId);
        metadata[layer.layerId][column.columnId] = operation;
      });
    }
  });

  return buildExpression(
    state,
    metadata,
    datasourceLayers,
    paletteService,
    datasourceExpressionsByLayers,
    eventAnnotationService
  );
};

const simplifiedLayerExpression = {
  [layerTypes.DATA]: (layer: XYDataLayerConfig) => ({ ...layer, hide: true }),
  [layerTypes.REFERENCELINE]: (layer: XYReferenceLineLayerConfig) => ({
    ...layer,
    hide: true,
    yConfig: layer.yConfig?.map(({ lineWidth, ...rest }) => ({
      ...rest,
      lineWidth: 1,
      icon: undefined,
      textVisibility: false,
    })),
  }),
  [layerTypes.ANNOTATIONS]: (layer: XYAnnotationLayerConfig) => ({
    ...layer,
    hide: true,
    annotations: layer.annotations?.map(({ lineWidth, ...rest }) => ({
      ...rest,
      lineWidth: 1,
      icon: undefined,
      textVisibility: false,
    })),
  }),
};

export function toPreviewExpression(
  state: State,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map((layer) => getLayerTypeOptions(layer, simplifiedLayerExpression)),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
      valueLabels: 'hide',
    },
    datasourceLayers,
    paletteService,
    {},
    datasourceExpressionsByLayers,
    eventAnnotationService
  );
}

export function getScaleType(metadata: OperationMetadata | null, defaultScale: ScaleType) {
  if (!metadata) {
    return defaultScale;
  }

  // use scale information if available
  if (metadata.scale === 'ordinal') {
    return ScaleType.Ordinal;
  }
  if (metadata.scale === 'interval' || metadata.scale === 'ratio') {
    return metadata.dataType === 'date' ? ScaleType.Time : ScaleType.Linear;
  }

  // fall back to data type if necessary
  switch (metadata.dataType) {
    case 'boolean':
    case 'string':
    case 'ip':
      return ScaleType.Ordinal;
    case 'date':
      return ScaleType.Time;
    default:
      return ScaleType.Linear;
  }
}

export const buildExpression = (
  state: State,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
): Ast | null => {
  const validDataLayers: ValidXYDataLayerConfig[] = getDataLayers(state.layers)
    .filter<ValidXYDataLayerConfig>((layer): layer is ValidXYDataLayerConfig =>
      Boolean(layer.accessors.length)
    )
    .map((layer) => ({
      ...layer,
      accessors: getSortedAccessors(datasourceLayers[layer.layerId], layer),
    }));

  // sorting doesn't change anything so we don't sort reference layers (TODO: should we make it work?)
  const validReferenceLayers = getReferenceLayers(state.layers).filter((layer) =>
    Boolean(layer.accessors.length)
  );

  const uniqueLabels = getUniqueLabels(state.layers);
  const validAnnotationsLayers = getAnnotationsLayers(state.layers)
    .filter((layer) => Boolean(layer.annotations.length))
    .map((layer) => {
      return {
        ...layer,
        annotations: layer.annotations.map((c) => ({
          ...c,
          label: uniqueLabels[c.id],
        })),
      };
    });

  if (!validDataLayers.length) {
    return null;
  }

  const validLayersWithYConfig = [...validDataLayers, ...validReferenceLayers];

  const isLeftAxis = validLayersWithYConfig.some(({ yConfig }) =>
    yConfig?.some((config) => config.axisMode === 'left')
  );
  const isRightAxis = validLayersWithYConfig.some(({ yConfig }) =>
    yConfig?.some((config) => config.axisMode === 'right')
  );

  const axes: YAxisConfig[] = [
    {
      position: 'left',
      extent: state?.yLeftExtent ? { ...state?.yLeftExtent, type: 'axisExtentConfig' } : undefined,
      showTitle: state?.axisTitlesVisibilitySettings?.yLeft ?? true,
      title: state.yTitle || '',
      showLabels: state?.tickLabelsVisibilitySettings?.yLeft ?? true,
      showGridLines: state?.gridlinesVisibilitySettings?.yLeft ?? true,
      labelsOrientation: state?.labelsOrientation?.yLeft ?? 0,
    },
    {
      position: 'right',
      extent: state?.yRightExtent
        ? { ...state?.yRightExtent, type: 'axisExtentConfig' }
        : undefined,
      showTitle: state?.axisTitlesVisibilitySettings?.yRight ?? true,
      title: state.yRightTitle || '',
      showLabels: state?.tickLabelsVisibilitySettings?.yRight ?? true,
      showGridLines: state?.gridlinesVisibilitySettings?.yRight ?? true,
      labelsOrientation: state?.labelsOrientation?.yRight ?? 0,
    },
  ];

  if (isLeftAxis) {
    axes.push({
      id: 'left',
      position: 'left',
    });
  }

  if (isRightAxis) {
    axes.push({
      id: 'right',
      position: 'right',
    });
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'layeredXyVis',
        arguments: {
          legend: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'legendConfig',
                  arguments: {
                    isVisible: [state.legend.isVisible],
                    showSingleSeries: state.legend.showSingleSeries
                      ? [state.legend.showSingleSeries]
                      : [],
                    position: !state.legend.isInside ? [state.legend.position] : [],
                    isInside: state.legend.isInside ? [state.legend.isInside] : [],
                    legendSize:
                      !state.legend.isInside && state.legend.legendSize
                        ? [state.legend.legendSize]
                        : [],
                    horizontalAlignment:
                      state.legend.horizontalAlignment && state.legend.isInside
                        ? [state.legend.horizontalAlignment]
                        : [],
                    verticalAlignment:
                      state.legend.verticalAlignment && state.legend.isInside
                        ? [state.legend.verticalAlignment]
                        : [],
                    // ensure that even if the user types more than 5 columns
                    // we will only show 5
                    floatingColumns: state.legend.floatingColumns
                      ? [Math.min(5, state.legend.floatingColumns)]
                      : [],
                    maxLines: state.legend.maxLines ? [state.legend.maxLines] : [],
                    shouldTruncate: [
                      state.legend.shouldTruncate ??
                        getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
                    ],
                  },
                },
              ],
            },
          ],
          fittingFunction: [state.fittingFunction || 'None'],
          endValue: [state.endValue || 'None'],
          emphasizeFitting: [state.emphasizeFitting || false],
          curveType: [state.curveType || 'LINEAR'],
          fillOpacity: [state.fillOpacity || 0.3],
          valueLabels: [state?.valueLabels || 'hide'],
          hideEndzones: [state?.hideEndzones || false],
          valuesInLegend: [state?.valuesInLegend || false],
          axes: [...axesToExpression(axes)],
          xAxisConfig: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'xAxisConfig',
                  arguments: {
                    id: ['x'],
                    position: ['bottom'],
                    title: [state.xTitle || ''],
                    showTitle: [state?.axisTitlesVisibilitySettings?.x ?? true],
                    showLabels: [state?.tickLabelsVisibilitySettings?.x ?? true],
                    showGridLines: [state?.gridlinesVisibilitySettings?.x ?? true],
                    labelsOrientation: [state?.labelsOrientation?.x ?? 0],
                  },
                },
              ],
            },
          ],
          layers: [
            ...validDataLayers.map((layer) =>
              dataLayerToExpression(
                layer,
                axes,
                datasourceLayers[layer.layerId],
                metadata,
                paletteService,
                datasourceExpressionsByLayers[layer.layerId]
              )
            ),
            ...validReferenceLayers.map((layer) =>
              referenceLineLayerToExpression(
                layer,
                axes,
                datasourceLayers[(layer as XYReferenceLineLayerConfig).layerId],
                datasourceExpressionsByLayers[layer.layerId]
              )
            ),
            ...validAnnotationsLayers.map((layer) =>
              annotationLayerToExpression(
                layer,
                eventAnnotationService,
                datasourceExpressionsByLayers[layer.layerId]
              )
            ),
          ],
        },
      },
    ],
  };
};

const buildTableExpression = (datasourceExpression: Ast): ExpressionAstExpression => ({
  type: 'expression',
  chain: [{ type: 'function', function: 'kibana', arguments: {} }, ...datasourceExpression.chain],
});

const axesToExpression = (axes: YAxisConfig[]): Ast[] => {
  return axes.map((axis) => ({
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'yAxisConfig',
        arguments: {
          id: axis.id ? [axis.id] : [],
          position: axis.position ? [axis.position] : [],
          extent: axis.extent
            ? [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'axisExtentConfig',
                      arguments: {
                        mode: [axis.extent?.mode || 'full'],
                        lowerBound:
                          axis.extent?.lowerBound !== undefined ? [axis.extent?.lowerBound] : [],
                        upperBound:
                          axis.extent?.upperBound !== undefined ? [axis.extent?.upperBound] : [],
                      },
                    },
                  ],
                },
              ]
            : [],
          showTitle: axis.showTitle ? [axis.showTitle] : [],
          title: axis.title ? [axis.title] : [],
          showLabels: axis.showLabels ? [axis.showLabels] : [],
          showGridLines: axis.showGridLines ? [axis.showGridLines] : [],
          labelsOrientation: axis.labelsOrientation !== undefined ? [axis.labelsOrientation] : [],
        },
      },
    ],
  }));
};

const referenceLineLayerToExpression = (
  layer: XYReferenceLineLayerConfig,
  axes: YAxisConfig[],
  datasourceLayer: DatasourcePublicAPI,
  datasourceExpression: Ast
): Ast => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'extendedReferenceLineLayer',
        arguments: {
          yConfig: layer.yConfig
            ? layer.yConfig.map((yConfig) =>
                extendedYConfigToExpression(yConfig, axes, defaultReferenceLineColor)
              )
            : [],
          accessors: layer.accessors,
          columnToLabel: [JSON.stringify(getColumnToLabelMap(layer, datasourceLayer))],
          ...(datasourceExpression ? { table: [buildTableExpression(datasourceExpression)] } : {}),
        },
      },
    ],
  };
};

const annotationLayerToExpression = (
  layer: XYAnnotationLayerConfig,
  eventAnnotationService: EventAnnotationServiceType,
  datasourceExpression: Ast
): Ast => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'extendedAnnotationLayer',
        arguments: {
          hide: [Boolean(layer.hide)],
          ...(datasourceExpression ? { table: [buildTableExpression(datasourceExpression)] } : {}),
          annotations: layer.annotations
            ? layer.annotations.map(
                (ann): Ast =>
                  eventAnnotationService.toExpression({
                    time: ann.key.timestamp,
                    label: ann.label || defaultAnnotationLabel,
                    textVisibility: ann.textVisibility,
                    icon: ann.icon,
                    lineStyle: ann.lineStyle,
                    lineWidth: ann.lineWidth,
                    color: ann.color,
                    isHidden: Boolean(ann.isHidden),
                  })
              )
            : [],
        },
      },
    ],
  };
};

const dataLayerToExpression = (
  layer: ValidXYDataLayerConfig,
  axes: YAxisConfig[],
  datasourceLayer: DatasourcePublicAPI,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  paletteService: PaletteRegistry,
  datasourceExpression: Ast
): Ast => {
  const columnToLabel = getColumnToLabelMap(layer, datasourceLayer);

  const xAxisOperation = datasourceLayer?.getOperationForColumnId(layer.xAccessor);

  const isHistogramDimension = Boolean(
    xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
  );

  const dataFromType = layer.seriesType.split('_');
  const seriesType = dataFromType[0];
  const isPercentage = dataFromType.includes('percentage');
  const isStacked = dataFromType.includes('stacked');
  const isHorizontal = dataFromType.includes('horizontal');

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'extendedDataLayer',
        arguments: {
          hide: [Boolean(layer.hide)],
          xAccessor: layer.xAccessor ? [layer.xAccessor] : [],
          yScaleType: [
            getScaleType(metadata[layer.layerId][layer.accessors[0]], ScaleType.Ordinal),
          ],
          xScaleType: [getScaleType(metadata[layer.layerId][layer.xAccessor], ScaleType.Linear)],
          isHistogram: [isHistogramDimension],
          isPercentage: isPercentage ? [isPercentage] : [],
          isStacked: isStacked ? [isStacked] : [],
          isHorizontal: isHorizontal ? [isHorizontal] : [],
          splitAccessor: layer.splitAccessor ? [layer.splitAccessor] : [],
          yConfig: layer.yConfig
            ? layer.yConfig.map((yConfig) => yConfigToExpression(yConfig, axes))
            : [],
          seriesType: [seriesType],
          accessors: layer.accessors,
          columnToLabel: [JSON.stringify(columnToLabel)],
          ...(datasourceExpression ? { table: [buildTableExpression(datasourceExpression)] } : {}),
          palette: [
            {
              type: 'expression',
              chain: [
                layer.palette
                  ? {
                      type: 'function',
                      function: 'theme',
                      arguments: {
                        variable: ['palette'],
                        default: [
                          paletteService.get(layer.palette.name).toExpression(layer.palette.params),
                        ],
                      },
                    }
                  : {
                      type: 'function',
                      function: 'system_palette',
                      arguments: {
                        name: ['default'],
                      },
                    },
              ],
            },
          ],
        },
      },
    ],
  };
};

const yConfigToExpression = (yConfig: YConfig, axes: YAxisConfig[], defaultColor?: string): Ast => {
  const axisId = axes.find((axis) => axis.id && axis.position === yConfig.axisMode)?.id;
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'yConfig',
        arguments: {
          axisId: axisId ? [axisId] : [],
          forAccessor: [yConfig.forAccessor],
          color: yConfig.color ? [yConfig.color] : defaultColor ? [defaultColor] : [],
        },
      },
    ],
  };
};

const extendedYConfigToExpression = (
  yConfig: YConfig,
  axes: YAxisConfig[],
  defaultColor?: string
): Ast => {
  const axisId = axes.find((axis) => axis.id && axis.position === yConfig.axisMode)?.id;
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'extendedYConfig',
        arguments: {
          axisId: axisId ? [axisId] : [],
          forAccessor: [yConfig.forAccessor],
          color: yConfig.color ? [yConfig.color] : defaultColor ? [defaultColor] : [],
          lineStyle: [yConfig.lineStyle || 'solid'],
          lineWidth: [yConfig.lineWidth || 1],
          fill: [yConfig.fill || 'none'],
          icon: hasIcon(yConfig.icon) ? [yConfig.icon] : [],
          iconPosition:
            hasIcon(yConfig.icon) || yConfig.textVisibility
              ? [yConfig.iconPosition || 'auto']
              : ['auto'],
          textVisibility: [yConfig.textVisibility || false],
        },
      },
    ],
  };
};
