/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { image } from '../../../canvas_plugin_src/functions/common/image';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import {
  URL,
  BASE64,
  IMAGE_MODE_CONTAIN,
  IMAGE_MODE_COVER,
  IMAGE_MODE_STRETCH,
} from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof image>> = {
  help: i18n.translate('xpack.canvas.functions.imageHelpText', {
    defaultMessage:
      'Displays an image. Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
    values: {
      BASE64,
      URL,
    },
  }),
  args: {
    dataurl: i18n.translate('xpack.canvas.functions.image.args.dataurlHelpText', {
      defaultMessage: 'The {https} {URL} or {BASE64} data {URL} of an image.',
      values: {
        BASE64,
        https: 'HTTP(S)',
        URL,
      },
    }),
    mode: i18n.translate('xpack.canvas.functions.image.args.modeHelpText', {
      defaultMessage:
        '{contain} shows the entire image, scaled to fit. ' +
        '{cover} fills the container with the image, cropping from the sides or bottom as needed. ' +
        '{stretch} resizes the height and width of the image to 100% of the container.',
      values: {
        contain: `\`"${IMAGE_MODE_CONTAIN}"\``,
        cover: `\`"${IMAGE_MODE_COVER}"\``,
        stretch: `\`"${IMAGE_MODE_STRETCH}"\``,
      },
    }),
  },
};

export const errors = {
  invalidImageMode: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.image.invalidImageModeErrorMessage', {
        defaultMessage: '"mode" must be "{contain}", "{cover}", or "{stretch}"',
        values: {
          contain: IMAGE_MODE_CONTAIN,
          cover: IMAGE_MODE_COVER,
          stretch: IMAGE_MODE_STRETCH,
        },
      })
    ),
};
