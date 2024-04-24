/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { LegendStats } from '@kbn/visualizations-plugin/common/constants';
import { PieLayerState, PieVisualizationState } from '../../../common/types';

type PersistedPieLayerState = Omit<PieLayerState, 'legendStats'> & {
  showValuesInLegend?: boolean;
};

export type PersistedPieVisualizationState = Omit<PieVisualizationState, 'layers'> & {
  layers: PersistedPieLayerState[];
};

export function convertToRuntime(state: PersistedPieVisualizationState) {
  if (state.layers.some((l) => 'showValuesInLegend' in l)) {
    return convertToLegendStats(state);
  }
  return state;
}

function convertToLegendStats(state: PieVisualizationState) {
  const newState = cloneDeep(state) as unknown as PieVisualizationState;

  newState.layers.forEach((l) => {
    if ('showValuesInLegend' in l) {
      l.legendStats = [
        ...new Set([
          ...(l.showValuesInLegend ? [LegendStats.values] : []),
          ...(l.legendStats || []),
        ]),
      ];
    }
    delete (l as PersistedPieLayerState).showValuesInLegend;
  });

  return newState;
}

export function convertToPersistable(state: PieVisualizationState) {
  const newState = cloneDeep(state) as unknown as PersistedPieVisualizationState;

  newState.layers.forEach((l) => {
    if ('legendStats' in l && Array.isArray(l.legendStats)) {
      l.showValuesInLegend = l.legendStats.includes(LegendStats.values);
      delete l.legendStats;
    }
  });

  return newState;
}
