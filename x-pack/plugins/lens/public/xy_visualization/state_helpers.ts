/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { FramePublicAPI, DatasourcePublicAPI } from '../types';
import { SeriesType, visualizationTypes, LayerConfig, YConfig, ValidLayer } from './types';

export function isHorizontalSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_horizontal' ||
    seriesType === 'bar_horizontal_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked'
  );
}

export function isHorizontalChart(layers: Array<{ seriesType: SeriesType }>) {
  return layers.every((l) => isHorizontalSeries(l.seriesType));
}

export function getIconForSeries(type: SeriesType): EuiIconType {
  const definition = visualizationTypes.find((t) => t.id === type);

  if (!definition) {
    throw new Error(`Unknown series type ${type}`);
  }

  return (definition.icon as EuiIconType) || 'empty';
}

export const getSeriesColor = (layer: LayerConfig, accessor: string) => {
  if (layer.splitAccessor) {
    return null;
  }
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color || null
  );
};

export const getColumnToLabelMap = (layer: LayerConfig, datasource: DatasourcePublicAPI) => {
  const columnToLabel: Record<string, string> = {};

  layer.accessors.concat(layer.splitAccessor ? [layer.splitAccessor] : []).forEach((accessor) => {
    const operation = datasource.getOperationForColumnId(accessor);
    if (operation?.label) {
      columnToLabel[accessor] = operation.label;
    }
  });
  return columnToLabel;
};

export function hasHistogramSeries(
  layers: ValidLayer[] = [],
  datasourceLayers?: FramePublicAPI['datasourceLayers']
) {
  if (!datasourceLayers) {
    return false;
  }
  const validLayers = layers.filter(({ accessors }) => accessors.length);

  return validLayers.some(({ layerId, xAccessor }: ValidLayer) => {
    const xAxisOperation = datasourceLayers[layerId].getOperationForColumnId(xAccessor);
    return (
      xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
    );
  });
}
