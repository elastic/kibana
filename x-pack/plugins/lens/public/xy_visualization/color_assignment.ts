/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, mapValues } from 'lodash';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin';
import { euiLightVars } from '@kbn/ui-theme';
import type { AccessorConfig, FramePublicAPI } from '../types';
import { getColumnToLabelMap } from './state_helpers';
import { FormatFactory } from '../../common';
import { isDataLayer, isReferenceLayer, isAnnotationsLayer } from './visualization_helpers';
import { getAnnotationsAccessorColorConfig } from './annotations/helpers';
import { getReferenceLineAccessorColorConfig } from './reference_line_helpers';
import { XYDataLayerConfig, XYLayerConfig } from './types';

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(sortedLayer: XYDataLayerConfig, seriesKey: string, yAccessor: string): number;
  }
>;

export function getColorAssignments(
  layers: XYLayerConfig[],
  data: { tables: Record<string, Datatable> },
  formatFactory: FormatFactory
): ColorAssignments {
  const layersPerPalette: Record<string, XYDataLayerConfig[]> = {};

  layers
    .filter((layer): layer is XYDataLayerConfig => isDataLayer(layer))
    .forEach((layer) => {
      const palette = layer.palette?.name || 'default';
      if (!layersPerPalette[palette]) {
        layersPerPalette[palette] = [];
      }
      layersPerPalette[palette].push(layer);
    });

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map((layer, layerIndex) => {
      if (!layer.splitAccessor) {
        return { numberOfSeries: layer.accessors.length, splits: [] };
      }
      const splitAccessor = layer.splitAccessor;
      const column = data.tables[layer.layerId]?.columns.find(({ id }) => id === splitAccessor);
      const columnFormatter = column && formatFactory(column.meta.params);
      const splits =
        !column || !data.tables[layer.layerId]
          ? []
          : uniq(
              data.tables[layer.layerId].rows.map((row) => {
                let value = row[splitAccessor];
                if (value && !isPrimitive(value)) {
                  value = columnFormatter?.convert(value) ?? value;
                } else {
                  value = String(value);
                }
                return value;
              })
            );
      return { numberOfSeries: (splits.length || 1) * layer.accessors.length, splits };
    });
    const totalSeriesCount = seriesPerLayer.reduce(
      (sum, perLayer) => sum + perLayer.numberOfSeries,
      0
    );
    return {
      totalSeriesCount,
      getRank(sortedLayer: XYDataLayerConfig, seriesKey: string, yAccessor: string) {
        const layerIndex = paletteLayers.findIndex((l) => sortedLayer.layerId === l.layerId);
        const currentSeriesPerLayer = seriesPerLayer[layerIndex];
        const splitRank = currentSeriesPerLayer.splits.indexOf(seriesKey);
        return (
          (layerIndex === 0
            ? 0
            : seriesPerLayer
                .slice(0, layerIndex)
                .reduce((sum, perLayer) => sum + perLayer.numberOfSeries, 0)) +
          (sortedLayer.splitAccessor && splitRank !== -1
            ? splitRank * sortedLayer.accessors.length
            : 0) +
          sortedLayer.accessors.indexOf(yAccessor)
        );
      },
    };
  });
}

export function getAccessorColorConfig(
  colorAssignments: ColorAssignments,
  frame: Pick<FramePublicAPI, 'datasourceLayers'>,
  layer: XYLayerConfig,
  paletteService: PaletteRegistry
): AccessorConfig[] {
  if (isReferenceLayer(layer)) {
    return getReferenceLineAccessorColorConfig(layer);
  }
  if (isAnnotationsLayer(layer)) {
    return getAnnotationsAccessorColorConfig(layer);
  }
  const layerContainsSplits = Boolean(layer.splitAccessor);
  const currentPalette: PaletteOutput = layer.palette || { type: 'palette', name: 'default' };
  const totalSeriesCount = colorAssignments[currentPalette.name]?.totalSeriesCount;
  return layer.accessors.map((accessor) => {
    const currentYConfig = layer.yConfig?.find((yConfig) => yConfig.forAccessor === accessor);
    if (layerContainsSplits) {
      return {
        columnId: accessor as string,
        triggerIcon: 'disabled',
      };
    }

    const columnToLabel = getColumnToLabelMap(layer, frame.datasourceLayers[layer.layerId]);
    const rank = colorAssignments[currentPalette.name].getRank(
      layer,
      columnToLabel[accessor] || accessor,
      accessor
    );
    const customColor =
      currentYConfig?.color ||
      (totalSeriesCount != null
        ? paletteService.get(currentPalette.name).getCategoricalColor(
            [
              {
                name: columnToLabel[accessor] || accessor,
                rankAtDepth: rank,
                totalSeriesAtDepth: totalSeriesCount,
              },
            ],
            { maxDepth: 1, totalSeries: totalSeriesCount },
            currentPalette.params
          )
        : undefined);
    return {
      columnId: accessor as string,
      triggerIcon: customColor ? 'color' : 'disabled',
      color: customColor ?? undefined,
    };
  });
}
