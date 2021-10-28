/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter/common';
import { ScaleType } from '@elastic/charts';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { State } from './types';
import { OperationMetadata, DatasourcePublicAPI } from '../types';
import { getColumnToLabelMap } from './state_helpers';
import type { ValidLayer, XYLayerConfig } from '../../common/expressions';
import { layerTypes } from '../../common';
import { hasIcon } from './xy_config_panel/reference_line_panel';
import { defaultReferenceLineColor } from './color_assignment';

export const getSortedAccessors = (datasource: DatasourcePublicAPI, layer: XYLayerConfig) => {
  const originalOrder = datasource
    .getTableSpec()
    .map(({ columnId }: { columnId: string }) => columnId)
    .filter((columnId: string) => layer.accessors.includes(columnId));
  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder.concat(layer.accessors)));
};

export const toExpression = (
  state: State,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {}
): Ast | null => {
  if (!state || !state.layers.length) {
    return null;
  }

  const metadata: Record<string, Record<string, OperationMetadata | null>> = {};
  state.layers.forEach((layer) => {
    metadata[layer.layerId] = {};
    const datasource = datasourceLayers[layer.layerId];
    datasource.getTableSpec().forEach((column) => {
      const operation = datasourceLayers[layer.layerId].getOperationForColumnId(column.columnId);
      metadata[layer.layerId][column.columnId] = operation;
    });
  });

  return buildExpression(state, metadata, datasourceLayers, paletteService, attributes);
};

export function toPreviewExpression(
  state: State,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry
) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map((layer) =>
        layer.layerType === layerTypes.DATA
          ? { ...layer, hide: true }
          : // cap the reference line to 1px
            {
              ...layer,
              hide: true,
              yConfig: layer.yConfig?.map(({ lineWidth, ...config }) => ({
                ...config,
                lineWidth: 1,
                icon: undefined,
                textVisibility: false,
              })),
            }
      ),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
      valueLabels: 'hide',
    },
    datasourceLayers,
    paletteService,
    {}
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
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {}
): Ast | null => {
  const validLayers = state.layers
    .filter((layer): layer is ValidLayer => Boolean(layer.accessors.length))
    .map((layer) => {
      if (!datasourceLayers) {
        return layer;
      }
      const sortedAccessors = getSortedAccessors(datasourceLayers[layer.layerId], layer);

      return {
        ...layer,
        accessors: sortedAccessors,
      };
    });

  if (!validLayers.length) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_xy_chart',
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
                  function: 'lens_xy_legendConfig',
                  arguments: {
                    isVisible: [state.legend.isVisible],
                    showSingleSeries: state.legend.showSingleSeries
                      ? [state.legend.showSingleSeries]
                      : [],
                    position: [state.legend.position],
                    isInside: state.legend.isInside ? [state.legend.isInside] : [],
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
                    shouldTruncate: [state.legend.shouldTruncate ?? true],
                  },
                },
              ],
            },
          ],
          fittingFunction: [state.fittingFunction || 'None'],
          curveType: [state.curveType || 'LINEAR'],
          fillOpacity: [state.fillOpacity || 0.3],
          yLeftExtent: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_xy_axisExtentConfig',
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
                  function: 'lens_xy_axisExtentConfig',
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
                  function: 'lens_xy_axisTitlesVisibilityConfig',
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
                  function: 'lens_xy_tickLabelsConfig',
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
                  function: 'lens_xy_gridlinesConfig',
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
                  function: 'lens_xy_labelsOrientationConfig',
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
          layers: validLayers.map((layer) => {
            const columnToLabel = getColumnToLabelMap(layer, datasourceLayers[layer.layerId]);

            const xAxisOperation =
              datasourceLayers &&
              datasourceLayers[layer.layerId].getOperationForColumnId(layer.xAccessor);

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
                  function: 'lens_xy_layer',
                  arguments: {
                    layerId: [layer.layerId],

                    hide: [Boolean(layer.hide)],

                    xAccessor: layer.xAccessor ? [layer.xAccessor] : [],
                    yScaleType: [
                      getScaleType(metadata[layer.layerId][layer.accessors[0]], ScaleType.Ordinal),
                    ],
                    xScaleType: [
                      getScaleType(metadata[layer.layerId][layer.xAccessor], ScaleType.Linear),
                    ],
                    isHistogram: [isHistogramDimension],
                    splitAccessor: layer.splitAccessor ? [layer.splitAccessor] : [],
                    yConfig: layer.yConfig
                      ? layer.yConfig.map((yConfig) => ({
                          type: 'expression',
                          chain: [
                            {
                              type: 'function',
                              function: 'lens_xy_yConfig',
                              arguments: {
                                forAccessor: [yConfig.forAccessor],
                                axisMode: yConfig.axisMode ? [yConfig.axisMode] : [],
                                color:
                                  layer.layerType === layerTypes.REFERENCELINE
                                    ? [yConfig.color || defaultReferenceLineColor]
                                    : yConfig.color
                                    ? [yConfig.color]
                                    : [],
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
                        }))
                      : [],
                    seriesType: [layer.seriesType],
                    layerType: [layer.layerType || layerTypes.DATA],
                    accessors: layer.accessors,
                    columnToLabel: [JSON.stringify(columnToLabel)],
                    ...(layer.palette
                      ? {
                          palette: [
                            {
                              type: 'expression',
                              chain: [
                                {
                                  type: 'function',
                                  function: 'theme',
                                  arguments: {
                                    variable: ['palette'],
                                    default: [
                                      paletteService
                                        .get(layer.palette.name)
                                        .toExpression(layer.palette.params),
                                    ],
                                  },
                                },
                              ],
                            },
                          ],
                        }
                      : {}),
                  },
                },
              ],
            };
          }),
        },
      },
    ],
  };
};
