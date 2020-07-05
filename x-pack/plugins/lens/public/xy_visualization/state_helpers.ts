/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { SeriesType, visualizationTypes, LayerConfig, YConfig } from './types';

export function isHorizontalSeries(seriesType: SeriesType) {
  return seriesType === 'bar_horizontal' || seriesType === 'bar_horizontal_stacked';
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
