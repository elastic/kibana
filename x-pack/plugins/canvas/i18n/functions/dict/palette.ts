/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { palette } from '../../../canvas_plugin_src/functions/common/palette';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof palette>> = {
  help: i18n.translate('xpack.canvas.functions.paletteHelpText', {
    defaultMessage: 'Creates a color palette.',
  }),
  args: {
    color: i18n.translate('xpack.canvas.functions.palette.args.colorHelpText', {
      defaultMessage:
        'The palette colors. Accepts an {html} color name, {hex}, {hsl}, {hsla}, {rgb}, or {rgba}.',
      values: {
        html: 'HTML',
        rgb: 'RGB',
        rgba: 'RGBA',
        hex: 'HEX',
        hsl: 'HSL',
        hsla: 'HSLA',
      },
    }),
    gradient: i18n.translate('xpack.canvas.functions.palette.args.gradientHelpText', {
      defaultMessage: 'Make a gradient palette where supported?',
    }),
    reverse: i18n.translate('xpack.canvas.functions.palette.args.reverseHelpText', {
      defaultMessage: 'Reverse the palette?',
    }),
  },
};
