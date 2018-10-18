/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: i18n.translate('xpack.canvas.uis.views.revealImageDisplayName', {
    defaultMessage: 'Reveal image',
  }),
  help: '',
  modelArgs: [
    [
      '_',
      {
        label: i18n.translate('xpack.canvas.uis.views.revealImage.modelArgs.underscoreLabel', {
          defaultMessage: 'Value',
        }),
      },
    ],
  ],
  args: [
    {
      name: 'image',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.args.imageDisplayName', {
        defaultMessage: 'Image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.args.imageHelpText', {
        defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageDisplayName', {
        defaultMessage: 'Background image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageHelpText', {
        defaultMessage: 'A background image. Eg, an empty glass',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.args.originDisplayName', {
        defaultMessage: 'Reveal from',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.args.originHelpText', {
        defaultMessage: 'The direction from which to start the reveal',
      }),
      argType: 'select',
      options: {
        choices: [
          {
            value: 'top',
            name: i18n.translate(
              'xpack.canvas.uis.views.revealImage.args.options.choices.topTitle',
              {
                defaultMessage: 'Top',
              }
            ),
          },
          {
            value: 'left',
            name: i18n.translate(
              'xpack.canvas.uis.views.revealImage.args.options.choices.leftTitle',
              {
                defaultMessage: 'Left',
              }
            ),
          },
          {
            value: 'bottom',
            name: i18n.translate(
              'xpack.canvas.uis.views.revealImage.args.options.choices.bottomTitle',
              {
                defaultMessage: 'Bottom',
              }
            ),
          },
          {
            value: 'right',
            name: i18n.translate(
              'xpack.canvas.uis.views.revealImage.args.options.choices.rightTitle',
              {
                defaultMessage: 'Right',
              }
            ),
          },
        ],
      },
    },
  ],
});
