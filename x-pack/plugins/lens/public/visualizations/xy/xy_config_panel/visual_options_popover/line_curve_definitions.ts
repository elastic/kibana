/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYCurveType } from '@kbn/expression-xy-plugin/common';
import { XYCurveTypes } from '@kbn/expression-xy-plugin/public';
import { i18n } from '@kbn/i18n';

export interface lineCurveDefinitions {
  type: XYCurveType;
  title: string;
  description?: string;
}

export const lineCurveDefinitions: lineCurveDefinitions[] = [
  {
    type: XYCurveTypes.LINEAR,
    title: i18n.translate('xpack.lens.lineCurve.linear', {
      defaultMessage: 'Linear',
    }),
    description: i18n.translate('xpack.lens.lineCurveDescription.linear', {
      defaultMessage: 'Linear connection between points',
    }),
  },
  {
    type: XYCurveTypes.CURVE_MONOTONE_X,
    title: i18n.translate('xpack.lens.lineCurve.interpolation', {
      defaultMessage: 'Interpolation',
    }),
    description: i18n.translate('xpack.lens.lineCurveDescription.interpolation', {
      defaultMessage: 'Smooth connection between points',
    }),
  },
  {
    type: XYCurveTypes.CURVE_STEP_AFTER,
    title: i18n.translate('xpack.lens.lineCurve.step', {
      defaultMessage: 'Step',
    }),
    description: i18n.translate('xpack.lens.lineCurveDescription.step', {
      defaultMessage: 'Step after connection between points',
    }),
  },
];
