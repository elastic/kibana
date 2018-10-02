/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '@kbn/interpreter/common/lib/fonts';
import { shapes } from '../../renderers/progress/shapes';

export const progress = () => ({
  name: 'progress',
  displayName: 'Progress',
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
      displayName: 'Maximum value',
      help: 'Maximum value of the progress element',
      argType: 'number',
      default: '1',
    },
    {
      name: 'valueColor',
      displayName: 'Progress Color',
      help: 'Color of the progress bar',
      argType: 'color',
      default: `#1785b0`,
    },
    {
      name: 'valueWeight',
      displayName: 'Progress Weight',
      help: 'Thickness of the progress bar',
      argType: 'number',
      default: '20',
    },
    {
      name: 'barColor',
      displayName: 'Background Color',
      help: 'Color of the background bar',
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'barWeight',
      displayName: 'Background Weight',
      help: 'Thickness of the background bar',
      argType: 'number',
      default: '20',
    },
    {
      name: 'label',
      displayName: 'Label',
      help: `Set true/false to show/hide label or provide a string to display as the label`,
      argType: 'toggle',
      default: 'true',
    },
    {
      name: 'font',
      displayName: 'Label Settings',
      help: 'Font settings for the label. Technically you can stick other styles in here too!',
      argType: 'font',
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
