/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { palette as paletteFn } from '../../functions/common/palette';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof paletteFn>> = {
  help: i18n.translate('xpack.canvas.functions.paletteHelpText', {
    defaultMessage: 'Create a color palette',
  }),
  args: {
    color: i18n.translate('xpack.canvas.functions.palette.args.colorHelpText', {
      defaultMessage:
        'Palette colors, {rgba}, {hex}, or {HTML} color string. Pass this multiple times.',
      values: {
        rgba: 'rgba',
        hex: 'hex',
        html: 'HTML',
      },
    }),
    gradient: i18n.translate('xpack.canvas.functions.palette.args.gradientHelpText', {
      defaultMessage: 'Prefer to make a gradient where supported and useful?',
    }),
    reverse: i18n.translate('xpack.canvas.functions.palette.args.reverseHelpText', {
      defaultMessage: 'Reverse the palette',
    }),
  },
};
