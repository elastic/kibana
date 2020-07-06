/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual, first, gt, gte, last, lt, lte, sortBy } from 'lodash';
import { mix, parseToRgb, toColorString } from 'polished';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapLegend,
  InfraWaffleMapRuleOperator,
  GradientLegendRT,
  SteppedGradientLegendRT,
  StepLegendRT,
  InfraWaffleMapStepRule,
  InfraWaffleMapGradientRule,
} from '../../../../lib/lib';

const OPERATOR_TO_FN = {
  [InfraWaffleMapRuleOperator.eq]: isEqual,
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
    if (StepLegendRT.is(legend)) {
      return convertToRgbString(calculateStepColor(legend.rules, value, defaultColor));
    }
    if (GradientLegendRT.is(legend)) {
      return convertToRgbString(calculateGradientColor(legend.rules, value, bounds, defaultColor));
    }
    if (SteppedGradientLegendRT.is(legend)) {
      return convertToRgbString(
        calculateSteppedGradientColor(legend.rules, value, bounds, defaultColor)
      );
    }
    return defaultColor;
  } catch (error) {
    return defaultColor;
  }
};

const normalizeValue = (min: number, max: number, value: number): number => {
  return (value - min) / (max - min);
};

export const calculateSteppedGradientColor = (
  rules: InfraWaffleMapGradientRule[],
  value: number | string,
  bounds: InfraWaffleMapBounds,
  defaultColor = 'rgba(217, 217, 217, 1)'
) => {
  const normalizedValue = normalizeValue(bounds.min, bounds.max, Number(value));
  const steps = rules.length;

  // Since the stepped legend matches a range we need to ensure anything outside
  // the max bounds get's the maximum color.
  if (gte(normalizedValue, (last(rules) as any).value)) {
    return (last(rules) as any).color;
  }

  return rules.reduce((color: string, rule) => {
    const min = rule.value - 1 / steps;
    const max = rule.value;
    if (gte(normalizedValue, min) && lte(normalizedValue, max)) {
      return rule.color;
    }
    return color;
  }, (first(rules) as any).color || defaultColor);
};

export const calculateStepColor = (
  rules: InfraWaffleMapStepRule[],
  value: number | string,
  defaultColor = 'rgba(217, 217, 217, 1)'
): string => {
  return rules.reduce((color: string, rule) => {
    const operatorFn = OPERATOR_TO_FN[rule.operator];
    if (operatorFn(value, rule.value)) {
      return rule.color;
    }
    return color;
  }, defaultColor);
};

export const calculateGradientColor = (
  rules: InfraWaffleMapGradientRule[],
  value: number | string,
  bounds: InfraWaffleMapBounds,
  defaultColor = 'rgba(0, 179, 164, 1)'
): string => {
  if (rules.length === 0) {
    return defaultColor;
  }
  if (rules.length === 1) {
    return (last(rules) as any).color;
  }
  const { min, max } = bounds;
  const sortedRules = sortBy(rules, 'value');
  const normValue = normalizeValue(min, max, Number(value));
  const startRule = sortedRules.reduce((acc, rule) => {
    if (rule.value <= normValue) {
      return rule;
    }
    return acc;
  }, first(sortedRules)) as any;
  const endRule = sortedRules
    .filter((r) => r !== startRule)
    .find((r) => r.value >= normValue) as any;
  if (!endRule) {
    return startRule.color;
  }

  const mixValue = normalizeValue(startRule.value, endRule.value, normValue);

  return mix(mixValue, endRule.color, startRule.color);
};
