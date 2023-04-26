/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, mapValues } from 'lodash';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { euiLightVars } from '@kbn/ui-theme';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotationConfig,
} from '@kbn/event-annotation-plugin/public';
import type { AccessorConfig, FramePublicAPI } from '../../types';
import { getColumnToLabelMap } from './state_helpers';
import { FormatFactory } from '../../../common/types';
import { isDataLayer, isReferenceLayer, isAnnotationsLayer } from './visualization_helpers';
import { getAnnotationsAccessorColorConfig } from './annotations/helpers';
import {
  getReferenceLineAccessorColorConfig,
  getSingleColorConfig,
} from './reference_line_helpers';
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

  layers.filter(isDataLayer).forEach((layer) => {
    const palette = layer.palette?.name || 'default';
    if (!layersPerPalette[palette]) {
      layersPerPalette[palette] = [];
    }
    layersPerPalette[palette].push(layer);
  });

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map((layer, layerIndex) => {
      if (layer.collapseFn || !layer.splitAccessor) {
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

function getDisabledConfig(accessor: string): AccessorConfig {
  return {
    columnId: accessor,
    triggerIconType: 'disabled',
  };
}

export function getAssignedColorConfig(
  layer: XYLayerConfig,
  accessor: string,
  colorAssignments: ColorAssignments,
  frame: Pick<FramePublicAPI, 'datasourceLayers'>,
  paletteService: PaletteRegistry
): AccessorConfig {
  if (isReferenceLayer(layer)) {
    return getSingleColorConfig(accessor);
  }
  if (isAnnotationsLayer(layer)) {
    const annotation = layer.annotations.find((a) => a.id === accessor);
    return {
      columnId: accessor,
      triggerIconType: annotation?.isHidden ? 'invisible' : 'color',
      color: isRangeAnnotationConfig(annotation)
        ? defaultAnnotationRangeColor
        : defaultAnnotationColor,
    };
  }
  const layerContainsSplits = isDataLayer(layer) && !layer.collapseFn && layer.splitAccessor;
  const currentPalette: PaletteOutput = layer.palette || { type: 'palette', name: 'default' };
  const totalSeriesCount = colorAssignments[currentPalette.name]?.totalSeriesCount;

  if (layerContainsSplits) {
    return getDisabledConfig(accessor);
  }

  const columnToLabel = getColumnToLabelMap(layer, frame.datasourceLayers[layer.layerId]);
  const rank = colorAssignments[currentPalette.name].getRank(
    layer,
    columnToLabel[accessor] || accessor,
    accessor
  );
  const assignedColor =
    totalSeriesCount != null
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
      : undefined;
  return {
    columnId: accessor,
    triggerIconType: assignedColor ? 'color' : 'disabled',
    color: assignedColor ?? undefined,
  };
}

export function getAccessorColorConfigs(
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
  const layerContainsSplits = !layer.collapseFn && layer.splitAccessor;
  return layer.accessors.map((accessor) => {
    if (layerContainsSplits) {
      return getDisabledConfig(accessor);
    }
    const currentYConfig = layer.yConfig?.find((yConfig) => yConfig.forAccessor === accessor);
    if (currentYConfig?.color) {
      return {
        columnId: accessor,
        triggerIconType: 'color',
        color: currentYConfig.color,
      };
    }
    return getAssignedColorConfig(layer, accessor, colorAssignments, frame, paletteService);
  });
}
