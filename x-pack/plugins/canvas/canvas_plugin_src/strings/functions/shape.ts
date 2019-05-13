/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { shape } from '../../functions/common/shape';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof shape>> = {
  help: i18n.translate('xpack.canvas.functions.shapeHelpText', {
    defaultMessage: 'Create a shape',
  }),
  args: {
    border: i18n.translate('xpack.canvas.functions.shape.args.borderHelpText', {
      defaultMessage: 'Valid {css} color string',
      values: {
        css: 'CSS',
      },
    }),
    borderWidth: i18n.translate('xpack.canvas.functions.shape.args.borderWidthHelpText', {
      defaultMessage: 'Thickness of the border',
    }),
    shape: i18n.translate('xpack.canvas.functions.shape.args.shapeHelpText', {
      defaultMessage: 'Pick a shape',
    }),
    fill: i18n.translate('xpack.canvas.functions.shape.args.fillHelpText', {
      defaultMessage: 'Valid {css} color string',
      values: {
        css: 'CSS',
      },
    }),
    maintainAspect: i18n.translate('xpack.canvas.functions.shape.args.maintainAspectHelpText', {
      defaultMessage: 'Select true to maintain aspect ratio',
    }),
  },
};
