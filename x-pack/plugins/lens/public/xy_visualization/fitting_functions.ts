/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Fit } from '@elastic/charts';
import type { FittingFunction } from '../../common/expressions/xy_chart/fitting_function';

export function getFitEnum(fittingFunction?: FittingFunction) {
  if (fittingFunction) {
    return Fit[fittingFunction];
  }
  return Fit.None;
}

export function getFitOptions(fittingFunction?: FittingFunction) {
  return { type: getFitEnum(fittingFunction) };
}
