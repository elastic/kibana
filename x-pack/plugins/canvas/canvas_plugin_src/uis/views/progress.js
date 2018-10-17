/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { openSans } from '../../../common/lib/fonts';
import { shapes } from '../../renderers/progress/shapes';

export const progress = () => ({
  name: 'progress',
  displayName: i18n.translate('xpack.canvas.uis.views.progressDisplayName', {
    defaultMessage: 'Progress',
  }),
  modelArgs: [['_', { label: 'Value' }]],
  requiresContext: false,
  args: [
    {
      name: 'shape',
      argType: 'select',
      options: {
        choices: Object.keys(shapes).map(key => ({
          value: key,
          //turns camel into title case
          name: key[0].toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        })),
      },
    },
    {
      name: 'max',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsMaxDisplayName', {
        defaultMessage: 'Maximum value',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsMaxHelpText', {
        defaultMessage: 'Maximum value of the progress element',
      }),
      argType: 'number',
      default: '1',
    },
    {
      name: 'valueColor',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsValueColorDisplayName', {
        defaultMessage: 'Progress color',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsValueColorHelpText', {
        defaultMessage: 'Color of the progress bar',
      }),
      argType: 'color',
      default: `#1785b0`,
    },
    {
      name: 'valueWeight',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsValueWeightDisplayName', {
        defaultMessage: 'Progress weight',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsValueWeightHelpText', {
        defaultMessage: 'Thickness of the progress bar',
      }),
      argType: 'number',
      default: '20',
    },
    {
      name: 'barColor',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsBarColorDisplayName', {
        defaultMessage: 'Background color',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsBarColorHelpText', {
        defaultMessage: 'Color of the background bar',
      }),
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'barWeight',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsBarWeightDisplayName', {
        defaultMessage: 'Background weight',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsBarWeightHelpText', {
        defaultMessage: 'Thickness of the background bar',
      }),
      argType: 'number',
      default: '20',
    },
    {
      name: 'label',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsLabelDisplayName', {
        defaultMessage: 'Label',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsLabelHelpText', {
        defaultMessage:
          'Set true/false to show/hide label or provide a string to display as the label',
      }),
      argType: 'toggle',
      default: 'true',
    },
    {
      name: 'font',
      displayName: i18n.translate('xpack.canvas.uis.views.progress.argsFontDisplayName', {
        defaultMessage: 'Label settings',
      }),
      help: i18n.translate('xpack.canvas.uis.views.progress.argsFontHelpText', {
        defaultMessage:
          'Font settings for the label. Technically, you can add other styles as well',
      }),
      argType: 'font',
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
