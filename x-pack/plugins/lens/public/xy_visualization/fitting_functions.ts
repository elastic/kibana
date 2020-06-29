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
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.None', {
      defaultMessage: 'none',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.None', {
      defaultMessage: 'Do not fill gaps',
    }),
  },
  {
    id: 'Zero',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Zero', {
      defaultMessage: 'zero',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Zero', {
      defaultMessage: 'Fill gaps with zeros',
    }),
  },
  {
    id: 'Linear',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Linear', {
      defaultMessage: 'linear',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Linear', {
      defaultMessage: 'Interpolate linearly between nearest values',
    }),
  },
  {
    id: 'Average',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Average', {
      defaultMessage: 'average',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Average', {
      defaultMessage: 'Fill gaps with the average of the nearest values',
    }),
  },
  {
    id: 'Nearest',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Nearest', {
      defaultMessage: 'nearest',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Nearest', {
      defaultMessage: 'Fill gaps with the nearest existing value',
    }),
  },
  {
    id: 'Carry',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Carry', {
      defaultMessage: 'carry',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Carry', {
      defaultMessage: 'Repeat last value till next value',
    }),
  },
  {
    id: 'Lookahead',
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.Lookahead', {
      defaultMessage: 'lookahead',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.Lookahead', {
      defaultMessage: 'Repeat next value till next value',
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
