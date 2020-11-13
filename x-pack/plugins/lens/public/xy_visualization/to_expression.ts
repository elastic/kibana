/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { ScaleType } from '@elastic/charts';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { State, ValidLayer, LayerConfig } from './types';
import { OperationMetadata, DatasourcePublicAPI } from '../types';

export const getSortedAccessors = (datasource: DatasourcePublicAPI, layer: LayerConfig) => {
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
      layers: state.layers.map((layer) => ({ ...layer, hide: true })),
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
                  },
                },
              ],
            },
          ],
          fittingFunction: [state.fittingFunction || 'None'],
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
          valueLabels: [state?.valueLabels || 'hide'],
          layers: validLayers.map((layer) => {
            const columnToLabel: Record<string, string> = {};

            const datasource = datasourceLayers[layer.layerId];
            layer.accessors
              .concat(layer.splitAccessor ? [layer.splitAccessor] : [])
              .forEach((accessor) => {
                const operation = datasource.getOperationForColumnId(accessor);
                if (operation?.label) {
                  columnToLabel[accessor] = operation.label;
                }
              });

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
                                color: yConfig.color ? [yConfig.color] : [],
                              },
                            },
                          ],
                        }))
                      : [],
                    seriesType: [layer.seriesType],
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
