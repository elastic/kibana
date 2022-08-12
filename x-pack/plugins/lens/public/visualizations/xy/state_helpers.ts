/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { SavedObjectReference } from '@kbn/core/public';
import type { FramePublicAPI, DatasourcePublicAPI } from '../../types';
import {
  visualizationTypes,
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  SeriesType,
  YConfig,
  XYState,
  XYPersistedState,
} from './types';
import { getDataLayers, isAnnotationsLayer, isDataLayer } from './visualization_helpers';

export function isHorizontalSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_horizontal' ||
    seriesType === 'bar_horizontal_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked'
  );
}

export function isPercentageSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_percentage_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked' ||
    seriesType === 'area_percentage_stacked'
  );
}

export function isStackedChart(seriesType: SeriesType) {
  return seriesType.includes('stacked');
}

export function isHorizontalChart(layers: XYLayerConfig[]) {
  return getDataLayers(layers).every((l) => isHorizontalSeries(l.seriesType));
}

export function getIconForSeries(type: SeriesType): EuiIconType {
  const definition = visualizationTypes.find((t) => t.id === type);

  if (!definition) {
    throw new Error(`Unknown series type ${type}`);
  }

  return (definition.icon as EuiIconType) || 'empty';
}

export const getSeriesColor = (layer: XYLayerConfig, accessor: string) => {
  if (isAnnotationsLayer(layer)) {
    return layer?.annotations?.find((ann) => ann.id === accessor)?.color || null;
  }
  if (isDataLayer(layer) && layer.splitAccessor) {
    return null;
  }
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color || null
  );
};

export const getColumnToLabelMap = (
  layer: XYDataLayerConfig | XYReferenceLineLayerConfig,
  datasource?: DatasourcePublicAPI
) => {
  const columnToLabel: Record<string, string> = {};
  layer.accessors
    .concat(isDataLayer(layer) && layer.splitAccessor ? [layer.splitAccessor] : [])
    .forEach((accessor) => {
      const operation = datasource?.getOperationForColumnId(accessor);
      if (operation?.label) {
        columnToLabel[accessor] = operation.label;
      }
    });
  return columnToLabel;
};

export function hasHistogramSeries(
  layers: XYDataLayerConfig[] = [],
  datasourceLayers?: FramePublicAPI['datasourceLayers']
) {
  if (!datasourceLayers) {
    return false;
  }
  const validLayers = layers.filter(({ accessors }) => accessors.length);

  return validLayers.some(({ layerId, xAccessor }: XYDataLayerConfig) => {
    if (!xAccessor) {
      return false;
    }

    const xAxisOperation = datasourceLayers[layerId]?.getOperationForColumnId(xAccessor);
    return (
      xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
    );
  });
}

function getLayerReferenceName(layerId: string) {
  return `xy-visualization-layer-${layerId}`;
}

export function extractReferences({ layers }: XYState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  const persistableLayers: Array<Omit<XYLayerConfig, 'indexPatternId'>> = [];
  layers.forEach((layer) => {
    if (isAnnotationsLayer(layer)) {
      const { indexPatternId, ...persistableLayer } = layer;
      savedObjectReferences.push({
        type: 'index-pattern',
        id: indexPatternId,
        name: getLayerReferenceName(layer.layerId),
      });
      persistableLayers.push(persistableLayer);
    } else {
      persistableLayers.push(layer);
    }
  });
  return { savedObjectReferences, state: { layers: persistableLayers } };
}

export function injectReferences(state: XYPersistedState, references: SavedObjectReference[]) {
  return {
    layers: state.layers.map((layer) => {
      if (!isAnnotationsLayer(layer)) {
        return layer;
      }
      return {
        ...layer,
        indexPatternId: references.find(
          ({ name }) => name === getLayerReferenceName(layer.layerId)
        )!.id,
      };
    }),
  };
}
