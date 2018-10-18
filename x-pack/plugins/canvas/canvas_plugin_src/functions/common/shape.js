/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const shape = () => ({
  name: 'shape',
  aliases: [],
  type: 'shape',
  help: i18n.translate('xpack.canvas.functions.shapeHelpText', {
    defaultMessage: 'Create a shape',
  }),
  context: {
    types: ['null'],
  },
  args: {
    shape: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.shape.args.shapeHelpText', {
        defaultMessage: 'Pick a shape',
      }),
      aliases: ['_'],
      default: 'square',
    },
    fill: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.shape.args.fillHelpText', {
        defaultMessage: 'Valid CSS color string',
      }),
      default: 'black',
    },
    border: {
      types: ['string', 'null'],
      aliases: ['stroke'],
      help: i18n.translate('xpack.canvas.functions.shape.args.borderHelpText', {
        defaultMessage: 'Valid CSS color string',
      }),
    },
    borderWidth: {
      types: ['number', 'null'],
      aliases: ['strokeWidth'],
      help: i18n.translate('xpack.canvas.functions.shape.args.borderWidthHelpText', {
        defaultMessage: 'Thickness of the border',
      }),
      default: '0',
    },
    maintainAspect: {
      types: ['boolean'],
      help: i18n.translate('xpack.canvas.functions.shape.args.maintainAspectHelpText', {
        defaultMessage: 'Select true to maintain aspect ratio',
      }),
      default: false,
    },
  },
  fn: (context, { shape, fill, border, borderWidth, maintainAspect }) => ({
    type: 'shape',
    shape,
    fill,
    border,
    borderWidth,
    maintainAspect,
  }),
});
