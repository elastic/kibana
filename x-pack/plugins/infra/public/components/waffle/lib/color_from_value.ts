/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eq, first, gt, gte, last, lt, lte, sortBy } from 'lodash';
import { mix, parseToRgb, toColorString } from 'polished';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapGradientLegend,
  InfraWaffleMapLegend,
  InfraWaffleMapRuleOperator,
  InfraWaffleMapStepLegend,
} from '../../../lib/lib';
import { isInfraWaffleMapGradientLegend, isInfraWaffleMapStepLegend } from './type_guards';

const OPERATOR_TO_FN = {
  [InfraWaffleMapRuleOperator.eq]: eq,
  [InfraWaffleMapRuleOperator.lt]: lt,
  [InfraWaffleMapRuleOperator.lte]: lte,
  [InfraWaffleMapRuleOperator.gte]: gte,
  [InfraWaffleMapRuleOperator.gt]: gt,
};

const convertToRgbString = (color: string) => {
  return toColorString(parseToRgb(color));
};

export const colorFromValue = (
  legend: InfraWaffleMapLegend,
  value: number | string,
  bounds: InfraWaffleMapBounds,
  defaultColor = 'rgba(217, 217, 217, 1)'
): string => {
  try {
    if (isInfraWaffleMapStepLegend(legend)) {
      return convertToRgbString(calculateStepColor(legend, value, defaultColor));
    }
    if (isInfraWaffleMapGradientLegend(legend)) {
      return convertToRgbString(calculateGradientColor(legend, value, bounds, defaultColor));
    }
    return defaultColor;
  } catch (error) {
    return defaultColor;
  }
};

const normalizeValue = (min: number, max: number, value: number): number => {
  return (value - min) / (max - min);
};

export const calculateStepColor = (
  legend: InfraWaffleMapStepLegend,
  value: number | string,
  defaultColor = 'rgba(217, 217, 217, 1)'
): string => {
  return sortBy(legend.rules, 'sortBy').reduce((color: string, rule) => {
    const operatorFn = OPERATOR_TO_FN[rule.operator];
    if (operatorFn(value, rule.value)) {
      return rule.color;
    }
    return color;
  }, defaultColor);
};

export const calculateGradientColor = (
  legend: InfraWaffleMapGradientLegend,
  value: number | string,
  bounds: InfraWaffleMapBounds,
  defaultColor = 'rgba(0, 179, 164, 1)'
): string => {
  if (legend.rules.length === 0) {
    return defaultColor;
  }
  if (legend.rules.length === 1) {
    return last(legend.rules).color;
  }
  const { min, max } = bounds;
  const sortedRules = sortBy(legend.rules, 'value');
  const normValue = normalizeValue(min, max, Number(value));
  const startRule = sortedRules.reduce((acc, rule) => {
    if (rule.value <= normValue) {
      return rule;
    }
    return acc;
  }, first(sortedRules));
  const endRule = sortedRules.filter(r => r !== startRule).find(r => r.value >= normValue);
  if (!endRule) {
    return startRule.color;
  }

  const mixValue = normalizeValue(startRule.value, endRule.value, normValue);

  return mix(mixValue, endRule.color, startRule.color);
};
