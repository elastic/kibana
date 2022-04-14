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
import {
  State,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYAnnotationLayerConfig,
} from './types';
import { OperationMetadata, DatasourcePublicAPI, DatasourceLayers } from '../types';
import { getColumnToLabelMap } from './state_helpers';
import type {
  ValidLayer,
  YConfig,
} from '../../../../../src/plugins/chart_expressions/expression_xy/common';
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
    attributes,
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
  attributes: Partial<{ title: string; description: string }> = {},
  eventAnnotationService: EventAnnotationServiceType
): Ast | null => {
  const validDataLayers = getDataLayers(state.layers)
    .filter((layer): layer is ValidLayer => Boolean(layer.accessors.length))
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

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'xyVis',
        arguments: {
          title: [attributes?.title || ''],
          description: [attributes?.description || ''],
          xTitle: [state.xTitle || ''],
          yTitle: [state.yTitle || ''],
          yRightTitle: [state.yRightTitle || ''],
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
                    position: [state.legend.position],
                    isInside: state.legend.isInside ? [state.legend.isInside] : [],
                    legendSize: [state.legend.legendSize],
                    horizontalAlignment: state.legend.horizontalAlignment
                      ? [state.legend.horizontalAlignment]
                      : [],
                    verticalAlignment: state.legend.verticalAlignment
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
          yLeftExtent: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'axisExtentConfig',
                  arguments: {
                    mode: [state?.yLeftExtent?.mode || 'full'],
                    lowerBound:
                      state?.yLeftExtent?.lowerBound !== undefined
                        ? [state?.yLeftExtent?.lowerBound]
                        : [],
                    upperBound:
                      state?.yLeftExtent?.upperBound !== undefined
                        ? [state?.yLeftExtent?.upperBound]
                        : [],
                  },
                },
              ],
            },
          ],
          yRightExtent: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'axisExtentConfig',
                  arguments: {
                    mode: [state?.yRightExtent?.mode || 'full'],
                    lowerBound:
                      state?.yRightExtent?.lowerBound !== undefined
                        ? [state?.yRightExtent?.lowerBound]
                        : [],
                    upperBound:
                      state?.yRightExtent?.upperBound !== undefined
                        ? [state?.yRightExtent?.upperBound]
                        : [],
                  },
                },
              ],
            },
          ],
          axisTitlesVisibilitySettings: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'axisTitlesVisibilityConfig',
                  arguments: {
                    x: [state?.axisTitlesVisibilitySettings?.x ?? true],
                    yLeft: [state?.axisTitlesVisibilitySettings?.yLeft ?? true],
                    yRight: [state?.axisTitlesVisibilitySettings?.yRight ?? true],
                  },
                },
              ],
            },
          ],
          tickLabelsVisibilitySettings: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'tickLabelsConfig',
                  arguments: {
                    x: [state?.tickLabelsVisibilitySettings?.x ?? true],
                    yLeft: [state?.tickLabelsVisibilitySettings?.yLeft ?? true],
                    yRight: [state?.tickLabelsVisibilitySettings?.yRight ?? true],
                  },
                },
              ],
            },
          ],
          gridlinesVisibilitySettings: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'gridlinesConfig',
                  arguments: {
                    x: [state?.gridlinesVisibilitySettings?.x ?? true],
                    yLeft: [state?.gridlinesVisibilitySettings?.yLeft ?? true],
                    yRight: [state?.gridlinesVisibilitySettings?.yRight ?? true],
                  },
                },
              ],
            },
          ],
          labelsOrientation: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'labelsOrientationConfig',
                  arguments: {
                    x: [state?.labelsOrientation?.x ?? 0],
                    yLeft: [state?.labelsOrientation?.yLeft ?? 0],
                    yRight: [state?.labelsOrientation?.yRight ?? 0],
                  },
                },
              ],
            },
          ],
          valueLabels: [state?.valueLabels || 'hide'],
          hideEndzones: [state?.hideEndzones || false],
          valuesInLegend: [state?.valuesInLegend || false],
          layers: [
            ...validDataLayers.map((layer) =>
              dataLayerToExpression(
                layer,
                datasourceLayers[layer.layerId],
                metadata,
                paletteService
              )
            ),
            ...validReferenceLayers.map((layer) =>
              referenceLineLayerToExpression(
                layer,
                datasourceLayers[(layer as XYReferenceLineLayerConfig).layerId]
              )
            ),
            ...validAnnotationsLayers.map((layer) =>
              annotationLayerToExpression(layer, eventAnnotationService)
            ),
          ],
        },
      },
    ],
  };
};

const referenceLineLayerToExpression = (
  layer: XYReferenceLineLayerConfig,
  datasourceLayer: DatasourcePublicAPI
): Ast => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'referenceLineLayer',
        arguments: {
          layerId: [layer.layerId],
          yConfig: layer.yConfig
            ? layer.yConfig.map((yConfig) =>
                yConfigToExpression(yConfig, defaultReferenceLineColor)
              )
            : [],
          accessors: layer.accessors,
          columnToLabel: [JSON.stringify(getColumnToLabelMap(layer, datasourceLayer))],
        },
      },
    ],
  };
};

const annotationLayerToExpression = (
  layer: XYAnnotationLayerConfig,
  eventAnnotationService: EventAnnotationServiceType
): Ast => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'annotationLayer',
        arguments: {
          hide: [Boolean(layer.hide)],
          layerId: [layer.layerId],
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
  layer: ValidLayer,
  datasourceLayer: DatasourcePublicAPI,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  paletteService: PaletteRegistry
): Ast => {
  const columnToLabel = getColumnToLabelMap(layer, datasourceLayer);

  const xAxisOperation = datasourceLayer?.getOperationForColumnId(layer.xAccessor);

  const isHistogramDimension = Boolean(
    xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
  );

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'dataLayer',
        arguments: {
          layerId: [layer.layerId],
          hide: [Boolean(layer.hide)],
          xAccessor: layer.xAccessor ? [layer.xAccessor] : [],
          yScaleType: [
            getScaleType(metadata[layer.layerId][layer.accessors[0]], ScaleType.Ordinal),
          ],
          xScaleType: [getScaleType(metadata[layer.layerId][layer.xAccessor], ScaleType.Linear)],
          isHistogram: [isHistogramDimension],
          splitAccessor: layer.splitAccessor ? [layer.splitAccessor] : [],
          yConfig: layer.yConfig
            ? layer.yConfig.map((yConfig) => yConfigToExpression(yConfig))
            : [],
          seriesType: [layer.seriesType],
          accessors: layer.accessors,
          columnToLabel: [JSON.stringify(columnToLabel)],
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

const yConfigToExpression = (yConfig: YConfig, defaultColor?: string): Ast => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'yConfig',
        arguments: {
          forAccessor: [yConfig.forAccessor],
          axisMode: yConfig.axisMode ? [yConfig.axisMode] : [],
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
