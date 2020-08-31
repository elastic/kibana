/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Fit } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export type FittingFunction = typeof fittingFunctionDefinitions[number]['id'];

export const fittingFunctionDefinitions = [
  {
    id: 'None',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.none', {
      defaultMessage: 'Hide',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.none', {
      defaultMessage: 'Do not fill gaps',
    }),
  },
  {
    id: 'Zero',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.zero', {
      defaultMessage: 'Zero',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.zero', {
      defaultMessage: 'Fill gaps with zeros',
    }),
  },
  {
    id: 'Linear',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.linear', {
      defaultMessage: 'Linear',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.linear', {
      defaultMessage: 'Fill gaps with a line',
    }),
  },
  {
    id: 'Carry',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.carry', {
      defaultMessage: 'Last',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.carry', {
      defaultMessage: 'Fill gaps with the last value',
    }),
  },
  {
    id: 'Lookahead',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.lookahead', {
      defaultMessage: 'Next',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.lookahead', {
      defaultMessage: 'Fill gaps with the next value',
    }),
  },
] as const;

export function getFitEnum(fittingFunction?: FittingFunction) {
  if (fittingFunction) {
    return Fit[fittingFunction];
  }
  return Fit.None;
}

export function getFitOptions(fittingFunction?: FittingFunction) {
  return { type: getFitEnum(fittingFunction) };
}
