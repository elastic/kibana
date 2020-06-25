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

export const fittingFunctionTitles: Record<FittingFunction, string> = {
  Carry: i18n.translate('xpack.lens.fittingFunctionsTitle.Carry.', {
    defaultMessage: 'Carry',
  }),
  Lookahead: i18n.translate('xpack.lens.fittingFunctionsTitle.Lookahead', {
    defaultMessage: 'Lookahead',
  }),
  Nearest: i18n.translate('xpack.lens.fittingFunctionsTitle.Nearest', {
    defaultMessage: 'Nearest',
  }),
  Average: i18n.translate('xpack.lens.fittingFunctionsTitle.Average', {
    defaultMessage: 'Average',
  }),
  Linear: i18n.translate('xpack.lens.fittingFunctionsTitle.Linear', {
    defaultMessage: 'Linear',
  }),
  Zero: i18n.translate('xpack.lens.fittingFunctionsTitle.Zero', {
    defaultMessage: 'Zero',
  }),
  None: i18n.translate('xpack.lens.fittingFunctionsTitle.None', { defaultMessage: 'None' }),
} as const;

export const fittingFunctionDescriptions: Record<FittingFunction, string> = {
  Carry: i18n.translate('xpack.lens.fittingFunctionsDescription.Carry', {
    defaultMessage: 'Repeat last value till next value',
  }),
  Lookahead: i18n.translate('xpack.lens.fittingFunctionsDescription.Lookahead', {
    defaultMessage: 'Repeat next value till next value',
  }),
  Nearest: i18n.translate('xpack.lens.fittingFunctionsDescription.Nearest', {
    defaultMessage: 'Fill gaps with the nearest existing value',
  }),
  Average: i18n.translate('xpack.lens.fittingFunctionsDescription.Average', {
    defaultMessage: 'Fill gaps with the average of the nearest values',
  }),
  Linear: i18n.translate('xpack.lens.fittingFunctionsDescription.Linear', {
    defaultMessage: 'Interpolate linearly between nearest values',
  }),
  Zero: i18n.translate('xpack.lens.fittingFunctionsDescription.Zero', {
    defaultMessage: 'Fill gaps with zeros',
  }),
  None: i18n.translate('xpack.lens.fittingFunctionsDescription.None', {
    defaultMessage: 'Do not fill gaps',
  }),
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
