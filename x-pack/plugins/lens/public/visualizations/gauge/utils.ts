/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLinear } from 'd3-scale';
import {
  ChartColorConfiguration,
  PaletteDefinition,
  PaletteRegistry,
  SeriesLayer,
} from 'src/plugins/charts/public';
import { DatatableRow } from 'src/plugins/expressions';
import Color from 'color';
import type { GaugeVisualizationState } from '../../../common/expressions/gauge_chart';

type GaugeAccessors = 'maxAccessor' | 'minAccessor' | 'goalAccessor' | 'metricAccessor';

type GaugeAccessorsType = Pick<GaugeVisualizationState, GaugeAccessors>;

export const getValueFromAccessor = (
  accessorName: GaugeAccessors,
  row?: DatatableRow,
  state?: GaugeAccessorsType
) => {
  if (row && state) {
    const accessor = state[accessorName];
    const value = accessor && row[accessor];
    if (typeof value === 'number') {
      return value;
    }
  }
};

export const getMaxValue = (row?: DatatableRow, state?: GaugeAccessorsType) => {
  const FALLBACK_VALUE = 100;
  const currentValue = getValueFromAccessor('maxAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  if (row && state) {
    const { metricAccessor, goalAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    const goalValue = goalAccessor && row[goalAccessor];
    if (metricValue != null) {
      const minValue = getMinValue(row, state);
      const biggerValue = Math.max(goalValue ?? 0, metricValue, 1);
      const nicelyRounded = scaleLinear().domain([minValue, biggerValue]).nice().ticks(4);
      if (nicelyRounded.length > 2)
        return nicelyRounded[nicelyRounded.length - 1] + nicelyRounded[1];
      return minValue === biggerValue ? biggerValue + 1 : biggerValue;
    }
  }
  return FALLBACK_VALUE;
};

export const getMinValue = (row?: DatatableRow, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('minAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const FALLBACK_VALUE = 0;
  if (row && state) {
    const { metricAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    if (metricValue < 0) {
      return metricValue - 10; // TODO: TO THINK THROUGH
    }
  }
  return FALLBACK_VALUE;
};

export const getMetricValue = (row?: DatatableRow, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('metricAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((minValue + maxValue) * 0.6);
};

export const getGoalValue = (row?: DatatableRow, state?: GaugeVisualizationState) => {
  const currentValue = getValueFromAccessor('goalAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((minValue + maxValue) * 0.8);
};

export const transparentizePalettes = (palettes: PaletteRegistry) => {
  const addAlpha = (c: string | null) => (c ? new Color(c).hex() + `80` : `000000`);
  const transparentizePalette = (palette: PaletteDefinition<unknown>) => ({
    ...palette,
    getCategoricalColor: (
      series: SeriesLayer[],
      chartConfiguration?: ChartColorConfiguration,
      state?: unknown
    ) => addAlpha(palette.getCategoricalColor(series, chartConfiguration, state)),
    getCategoricalColors: (size: number, state?: unknown): string[] =>
      palette.getCategoricalColors(size, state).map(addAlpha),
  });

  return {
    ...palettes,
    get: (name: string) => transparentizePalette(palettes.get(name)),
    getAll: () => palettes.getAll().map((singlePalette) => transparentizePalette(singlePalette)),
  };
};
