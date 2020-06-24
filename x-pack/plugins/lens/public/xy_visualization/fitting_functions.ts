/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Fit } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export type FittingFunction = typeof fittingFunctions[number];

export const fittingFunctions = [
  'Carry',
  'Lookahead',
  'Nearest',
  'Average',
  'Linear',
  'Zero',
  'None',
] as const;

export const fittingFunctionDescriptions = {
  Carry: i18n.translate('xpack.lens.fittingFunctions.Carry', {
    defaultMessage: 'Repeat last value till next value',
  }),
  Lookahead: i18n.translate('xpack.lens.fittingFunctions.Lookahead', {
    defaultMessage: 'Repeat next value till next value',
  }),
  Nearest: i18n.translate('xpack.lens.fittingFunctions.Nearest', {
    defaultMessage: 'Fill gaps with the nearest existing value',
  }),
  Average: i18n.translate('xpack.lens.fittingFunctions.Average', {
    defaultMessage: 'Fill gaps with the average of the nearest values',
  }),
  Linear: i18n.translate('xpack.lens.fittingFunctions.Linear', {
    defaultMessage: 'Interpolate linearly between nearest values',
  }),
  Zero: i18n.translate('xpack.lens.fittingFunctions.Zero', {
    defaultMessage: 'Fill gaps with zeros',
  }),
  None: i18n.translate('xpack.lens.fittingFunctions.None', { defaultMessage: 'Do not fill gaps' }),
} as const;

export function getFitEnum(fittingFunction?: FittingFunction) {
  if (fittingFunction) {
    return Fit[fittingFunction];
  }
  return Fit.None;
}

export function getFitOptions(fittingFunction?: FittingFunction) {
  return { type: getFitEnum(fittingFunction) };
}
