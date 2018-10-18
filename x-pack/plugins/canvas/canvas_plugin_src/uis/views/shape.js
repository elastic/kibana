/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { shapes } from '../../renderers/shape/shapes';

export const shape = () => ({
  name: 'shape',
  displayName: i18n.translate('xpack.canvas.uis.views.shapeDisplayName', {
    defaultMessage: 'Shape',
  }),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: i18n.translate('xpack.canvas.uis.views.shape.args.underscoreDisplayName', {
        defaultMessage: 'Select a shape',
      }),
      argType: 'shape',
      options: {
        shapes,
      },
    },
    {
      name: 'fill',
      displayName: i18n.translate('xpack.canvas.uis.views.shape.args.fillDisplayName', {
        defaultMessage: 'Fill',
      }),
      argType: 'color',
      help: i18n.translate('xpack.canvas.uis.views.shape.args.fillHelpText', {
        defaultMessage: 'Fill color of the shape',
      }),
    },
    {
      name: 'border',
      displayName: i18n.translate('xpack.canvas.uis.views.shape.args.borderDisplayName', {
        defaultMessage: 'Border',
      }),
      argType: 'color',
      help: i18n.translate('xpack.canvas.uis.views.shape.args.borderHelpText', {
        defaultMessage: 'Border color',
      }),
    },
    {
      name: 'borderWidth',
      displayName: i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthDisplayName', {
        defaultMessage: 'Border width',
      }),
      argType: 'number',
      help: i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthHelpText', {
        defaultMessage: 'Border width',
      }),
    },
    {
      name: 'maintainAspect',
      displayName: i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectDisplayName', {
        defaultMessage: 'Maintain aspect ratio',
      }),
      argType: 'toggle',
      help: i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectHelpText', {
        defaultMessage: "Select 'true' to maintain aspect ratio",
      }),
    },
  ],
});
