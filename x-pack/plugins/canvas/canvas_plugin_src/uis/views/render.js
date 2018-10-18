/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const render = () => ({
  name: 'render',
  displayName: i18n.translate('xpack.canvas.uis.views.renderDisplayName', {
    defaultMessage: 'Element style',
  }),
  help: i18n.translate('xpack.canvas.uis.views.renderHelpText', {
    defaultMessage: 'Setting for the container around your element',
  }),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: 'containerStyle',
      argType: 'containerStyle',
    },
    {
      name: 'css',
      displayName: i18n.translate('xpack.canvas.uis.views.render.args.cssDisplayName', {
        defaultMessage: 'CSS',
      }),
      help: i18n.translate('xpack.canvas.uis.views.render.args.cssHelpText', {
        defaultMessage: 'A CSS stylesheet scoped to your element',
      }),
      argType: 'textarea',
      default: `".canvasRenderEl {

}"`,
      options: {
        confirm: i18n.translate('xpack.canvas.uis.views.render.args.options.confirmButtonLabel', {
          defaultMessage: 'Apply stylesheet',
        }),
      },
    },
  ],
});
