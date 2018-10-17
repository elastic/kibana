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
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.argsImageDisplayName', {
        defaultMessage: 'Image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.argsImageHelpText', {
        defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.argsEmptyImageDisplayName', {
        defaultMessage: 'Background image',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.argsEmptyImageHelpText', {
        defaultMessage: 'A background image. Eg, an empty glass',
      }),
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: i18n.translate('xpack.canvas.uis.views.revealImage.argsOriginDisplayName', {
        defaultMessage: 'Reveal from',
      }),
      help: i18n.translate('xpack.canvas.uis.views.revealImage.argsOriginHelpText', {
        defaultMessage: 'The direction from which to start the reveal',
      }),
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: 'Top' },
          { value: 'left', name: 'Left' },
          { value: 'bottom', name: 'Bottom' },
          { value: 'right', name: 'Right' },
        ],
      },
    },
  ],
});
