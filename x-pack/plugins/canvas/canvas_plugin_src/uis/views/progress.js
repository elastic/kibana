/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { shapes } from '../../renderers/progress/shapes';

export const progress = () => ({
  name: 'progress',
  displayName: 'Progress',
  modelArgs: [['_', { label: 'Value' }]],
  requiresContext: false,
  args: [
    {
      name: 'shape',
      displayName: 'Select a Shape',
      argType: 'shape',
      help: 'A basic shape',
      options: {
        shapes,
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
      name: 'barColor',
      displayName: 'Background Color',
      help: 'Color of the background bar',
      argType: 'color',
      default: `#f0f0f0`,
    },
    {
      name: 'weight',
      displayName: 'Weight',
      help: 'Thickness of the bar in pixels',
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
      name: 'labelPosition',
      displayName: 'Label Position',
      help: `Set the position of the label`,
      argType: 'select',
      default: 'center',
      options: {
        choices: [
          { value: 'center', name: 'Center' },
          { value: 'above', name: 'Above' },
          { value: 'below', name: 'Below' },
          { value: 'left', name: 'On the left' },
          { value: 'right', name: 'On the right' },
        ],
      },
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
