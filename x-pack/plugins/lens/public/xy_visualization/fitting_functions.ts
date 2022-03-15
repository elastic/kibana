/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fit } from '@elastic/charts';
import { EndValue, FittingFunction } from '../../common/expressions';

export function getFitEnum(fittingFunction?: FittingFunction | EndValue) {
  if (fittingFunction) {
    return Fit[fittingFunction];
  }
  return Fit.None;
}

export function getEndValue(endValue?: EndValue) {
  if (endValue === 'Nearest') {
    return Fit[endValue];
  }
  if (endValue === 'Zero') {
    return 0;
  }
  return undefined;
}

export function getFitOptions(fittingFunction?: FittingFunction, endValue?: EndValue) {
  return { type: getFitEnum(fittingFunction), endValue: getEndValue(endValue) };
}
