/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const markdown = () => ({
  name: 'markdown',
  displayName: i18n.translate('xpack.canvas.uis.views.markdownDisplayName', {
    defaultMessage: 'Markdown',
  }),
  help: i18n.translate('xpack.canvas.uis.views.markdownHelpText', {
    defaultMessage: 'Generate markup using markdown',
  }),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: i18n.translate('xpack.canvas.uis.views.markdown.argsContentDisplayName', {
        defaultMessage: 'Markdown content',
      }),
      help: i18n.translate('xpack.canvas.uis.views.markdown.argsContentHelpText', {
        defaultMessage: 'Markdown formatted text',
      }),
      argType: 'textarea',
      default: '""',
      options: {
        confirm: 'Apply',
      },
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
  ],
});
