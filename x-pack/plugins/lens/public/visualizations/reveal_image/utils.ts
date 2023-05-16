/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Accessors } from '@kbn/expression-gauge-plugin/common';
import { DatatableRow } from '@kbn/expressions-plugin/common';
import type { RevealImageVisualizationState } from './constants';

export const getAccessorsFromState = (
  state?: RevealImageVisualizationState
): Accessors | undefined => {
  const { metricAccessor } = state ?? {};
  if (!metricAccessor) {
    return;
  }
  return { metric: metricAccessor };
};

function getNiceNumber(localRange: number) {
  const exponent = Math.floor(Math.log10(localRange));
  const fraction = localRange / Math.pow(10, exponent);
  let niceFraction = 10;

  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;

  return niceFraction * Math.pow(10, exponent);
}

// returns nice rounded numbers similar to d3 nice() function
function getNiceRange(min: number, max: number) {
  const maxTicks = 5;
  const offsetMax = max + 0.0000001; // added to avoid max value equal to metric value
  const range = getNiceNumber(offsetMax - min);
  const tickSpacing = getNiceNumber(range / (maxTicks - 1));
  return {
    min: Math.floor(min / tickSpacing) * tickSpacing,
    max: Math.ceil(Math.ceil(offsetMax / tickSpacing) * tickSpacing),
  };
}

export const getMaxValue = (
  row?: DatatableRow,
  accessors?: Accessors,
  isRespectRanges?: boolean
): number => {
  const FALLBACK_VALUE = 100;
  const currentValue = accessors?.max ? getValueFromAccessor(accessors.max, row) : undefined;
  if (currentValue !== undefined && currentValue !== null) {
    return currentValue;
  }

  if (isRespectRanges) {
    const metricValue = accessors?.metric ? getValueFromAccessor(accessors.metric, row) : undefined;
    return metricValue;
  }

  if (row && accessors) {
    const { metric, goal } = accessors;
    const metricValue = metric && row[metric];
    const goalValue = goal && row[goal];
    const minValue = 0;
    if (metricValue != null) {
      const numberValues = [minValue, goalValue, metricValue].filter((v) => typeof v === 'number');
      const maxValue = Math.max(...numberValues);
      return getNiceRange(minValue, maxValue).max;
    }
  }
  return FALLBACK_VALUE;
};

export const getValueFromAccessor = (
  accessor: string,
  row?: DatatableRow
): DatatableRow[string] | number | undefined => {
  if (!row || !accessor) return;

  const value = accessor && row[accessor];
  if (value === null || (Array.isArray(value) && !value.length)) {
    return;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value) && typeof value[value.length - 1] === 'number') {
    return value[value.length - 1];
  }
};

export function getConfigurationAccessors(state: RevealImageVisualizationState) {
  const { metricAccessor } = state ?? {};

  const accessors = getAccessorsFromState(state);

  return { metricAccessor, accessors };
}
