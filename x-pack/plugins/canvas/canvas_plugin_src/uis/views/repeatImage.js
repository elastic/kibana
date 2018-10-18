/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: i18n.translate('xpack.canvas.uis.views.repeatImageDisplayName', {
    defaultMessage: 'Repeating image',
  }),
  help: '',
  modelArgs: [
    [
      '_',
      {
        label: i18n.translate('xpack.canvas.uis.views.repeatImage.modelArgs.underscoreLabel', {
          defaultMessage: 'Value',
        }),
      },
    ],
  ],
  args: [
    {
      name: 'image',
      displayName: i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageDisplayName', {
        defaultMessage: 'Image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageHelpText', {
        defaultMessage: 'An image to repeat',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageDisplayName', {
        defaultMessage: 'Empty image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageHelpText', {
        defaultMessage: 'An image to fill up the difference between the value and the max count',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'size',
      displayName: i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeDisplayName', {
        defaultMessage: 'Image size',
      }),
      help: i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeHelpText', {
        defaultMessage:
          'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
      }),
      argType: 'number',
      default: '100',
    },
    {
      name: 'max',
      displayName: i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxDisplayName', {
        defaultMessage: 'Max count',
      }),
      help: i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxHelpText', {
        defaultMessage: 'The maximum number of repeated images',
      }),
      argType: 'number',
      default: '1000',
    },
  ],
});
