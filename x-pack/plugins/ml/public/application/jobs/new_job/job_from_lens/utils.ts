/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Embeddable,
  LensPublicStart,
  LensSavedObjectAttributes,
  FieldBasedIndexPatternColumn,
  XYDataLayerConfig,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  SeriesType,
  XYLayerConfig,
} from '@kbn/lens-plugin/public';
import {
  layerTypes,
  LensIconChartBarAnnotations,
  LensIconChartBarReferenceLine,
} from '@kbn/lens-plugin/public';

export const COMPATIBLE_SERIES_TYPES: SeriesType[] = [
  'line',
  'bar',
  'bar_stacked',
  'bar_percentage_stacked',
  'bar_horizontal',
  'bar_horizontal_stacked',
  'area',
  'area_stacked',
  'area_percentage_stacked',
];

export const COMPATIBLE_LAYER_TYPE: XYDataLayerConfig['layerType'] = layerTypes.DATA;

export const COMPATIBLE_VISUALIZATION = 'lnsXY';

export function getJobsItemsFromEmbeddable(embeddable: Embeddable) {
  const { query, filters, timeRange } = embeddable.getInput();

  if (timeRange === undefined) {
    throw Error('Time range not specified.');
  }
  const { to, from } = timeRange;

  const vis = embeddable.getSavedVis();
  if (vis === undefined) {
    throw Error('Visualization cannot be found.');
  }

  return {
    vis,
    from,
    to,
    query,
    filters,
  };
}

export function lensOperationToMlFunction(op: string) {
  switch (op) {
    case 'average':
      return 'mean';
    case 'count':
      return 'count';
    case 'max':
      return 'max';
    case 'median':
      return 'median';
    case 'min':
      return 'min';
    case 'sum':
      return 'sum';
    case 'unique_count':
      return 'distinct_count';

    default:
      return null;
  }
}

export async function getVisTypeFactory(lens: LensPublicStart) {
  const visTypes = await lens.getXyVisTypes();
  return (layer: XYLayerConfig) => {
    switch (layer.layerType) {
      case layerTypes.DATA:
        const type = visTypes.find((t) => t.id === layer.seriesType);
        return {
          label: type?.label ?? layer.layerType,
          icon: type?.icon ?? '',
        };
      case layerTypes.ANNOTATIONS:
        return {
          label: 'Annotations',
          icon: LensIconChartBarAnnotations,
        };
      case layerTypes.REFERENCELINE:
        return {
          label: 'Reference line',
          icon: LensIconChartBarReferenceLine,
        };
      default:
        return {
          // @ts-expect-error just in case a new layer type appears in the future
          label: layer.layerType,
          icon: '',
        };
    }
  };
}

export async function isCompatibleVisualizationType(vis: LensSavedObjectAttributes) {
  return vis.visualizationType === COMPATIBLE_VISUALIZATION;
}

export function isCompatibleLayer(layer: XYLayerConfig): layer is XYDataLayerConfig {
  return (
    isDataLayer(layer) &&
    layer.layerType === COMPATIBLE_LAYER_TYPE &&
    COMPATIBLE_SERIES_TYPES.includes(layer.seriesType)
  );
}

export function isDataLayer(layer: XYLayerConfig): layer is XYDataLayerConfig {
  return 'seriesType' in layer;
}
export function hasSourceField(
  column: GenericIndexPatternColumn
): column is FieldBasedIndexPatternColumn {
  return 'sourceField' in column;
}

export function isTermsField(column: GenericIndexPatternColumn): column is TermsIndexPatternColumn {
  return column.operationType === 'terms' && 'params' in column;
}

export function isStringField(column: GenericIndexPatternColumn) {
  return column.dataType === 'string';
}

export function hasIncompatibleProperties(column: GenericIndexPatternColumn) {
  return 'timeShift' in column || 'filter' in column;
}
