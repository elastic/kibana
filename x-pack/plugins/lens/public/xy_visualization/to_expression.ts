/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { ScaleType } from '@elastic/charts';
import { State, LayerConfig } from './types';
import { FramePublicAPI, OperationMetadata } from '../types';

interface ValidLayer extends LayerConfig {
  xAccessor: NonNullable<LayerConfig['xAccessor']>;
}

function xyTitles(layer: LayerConfig, frame: FramePublicAPI) {
  const defaults = {
    xTitle: 'x',
    yTitle: 'y',
  };

  if (!layer || !layer.accessors.length) {
    return defaults;
  }
  const datasource = frame.datasourceLayers[layer.layerId];
  if (!datasource) {
    return defaults;
  }
  const x = layer.xAccessor ? datasource.getOperationForColumnId(layer.xAccessor) : null;
  const y = layer.accessors[0] ? datasource.getOperationForColumnId(layer.accessors[0]) : null;

  return {
    xTitle: x ? x.label : defaults.xTitle,
    yTitle: y ? y.label : defaults.yTitle,
  };
}

export const toExpression = (state: State, frame: FramePublicAPI): Ast | null => {
  if (!state || !state.layers.length) {
    return null;
  }

  const metadata: Record<string, Record<string, OperationMetadata | null>> = {};
  state.layers.forEach((layer) => {
    metadata[layer.layerId] = {};
    const datasource = frame.datasourceLayers[layer.layerId];
    datasource.getTableSpec().forEach((column) => {
      const operation = frame.datasourceLayers[layer.layerId].getOperationForColumnId(
        column.columnId
      );
      metadata[layer.layerId][column.columnId] = operation;
    });
  });

  return buildExpression(state, metadata, frame, xyTitles(state.layers[0], frame));
};

export function toPreviewExpression(state: State, frame: FramePublicAPI) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map((layer) => ({ ...layer, hide: true })),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
    },
    frame
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
  frame?: FramePublicAPI,
  { xTitle, yTitle }: { xTitle: string; yTitle: string } = { xTitle: '', yTitle: '' }
): Ast | null => {
  const validLayers = state.layers.filter((layer): layer is ValidLayer =>
    Boolean(layer.xAccessor && layer.accessors.length)
  );
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
          xTitle: [xTitle],
          yTitle: [yTitle],
          legend: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_xy_legendConfig',
                  arguments: {
                    isVisible: [state.legend.isVisible],
                    position: [state.legend.position],
                  },
                },
              ],
            },
          ],
          fittingFunction: [state.fittingFunction || 'None'],
          layers: validLayers.map((layer) => {
            const columnToLabel: Record<string, string> = {};

            if (frame) {
              const datasource = frame.datasourceLayers[layer.layerId];
              layer.accessors
                .concat(layer.splitAccessor ? [layer.splitAccessor] : [])
                .forEach((accessor) => {
                  const operation = datasource.getOperationForColumnId(accessor);
                  if (operation?.label) {
                    columnToLabel[accessor] = operation.label;
                  }
                });
            }

            const xAxisOperation =
              frame &&
              frame.datasourceLayers[layer.layerId].getOperationForColumnId(layer.xAccessor);

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

                    xAccessor: [layer.xAccessor],
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
