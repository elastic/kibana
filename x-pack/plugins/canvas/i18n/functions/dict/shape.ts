/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { shape } from '../../../canvas_plugin_src/functions/common/shape';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { SVG } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof shape>> = {
  help: i18n.translate('xpack.canvas.functions.shapeHelpText', {
    defaultMessage: 'Creates a shape.',
  }),
  args: {
    shape: i18n.translate('xpack.canvas.functions.shape.args.shapeHelpText', {
      defaultMessage: 'Pick a shape.',
    }),
    border: i18n.translate('xpack.canvas.functions.shape.args.borderHelpText', {
      defaultMessage: 'An {SVG} color for the border outlining the shape.',
      values: {
        SVG,
      },
    }),
    borderWidth: i18n.translate('xpack.canvas.functions.shape.args.borderWidthHelpText', {
      defaultMessage: 'The thickness of the border.',
    }),
    fill: i18n.translate('xpack.canvas.functions.shape.args.fillHelpText', {
      defaultMessage: 'An {SVG} color to fill the shape.',
      values: {
        SVG,
      },
    }),
    maintainAspect: i18n.translate('xpack.canvas.functions.shape.args.maintainAspectHelpText', {
      defaultMessage: `Maintain the shape's original aspect ratio?`,
    }),
  },
};
