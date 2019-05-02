/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { openSans } from '../../../common/lib/fonts';
import { ContextFunction, Render, Style } from '../types';

type Shape =
  | 'gauge'
  | 'horizontalBar'
  | 'horizontalPill'
  | 'semicircle'
  | 'unicorn'
  | 'verticalBar'
  | 'verticalPill'
  | 'wheel';

interface Arguments {
  barColor: string;
  barWeight: number;
  font: Style;
  label: boolean | string;
  max: number;
  shape: Shape;
  valueColor: string;
  valueWeight: number;
}

const shapes: Shape[] = [
  'gauge',
  'horizontalBar',
  'horizontalPill',
  'semicircle',
  'unicorn',
  'verticalBar',
  'verticalPill',
  'wheel',
];

export function progress(): ContextFunction<'progress', number, Arguments, Render<Arguments>> {
  return {
    name: 'progress',
    aliases: [],
    type: 'render',
    help: 'Configure a progress element',
    context: {
      types: ['number'],
    },
    args: {
      barColor: {
        default: `#f0f0f0`,
        help: 'Color of the background bar',
        types: ['string'],
      },
      barWeight: {
        default: 20,
        help: 'Thickness of the background bar',
        types: ['number'],
      },
      font: {
        default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
        help: 'Font settings for the label. Technically you can stick other styles in here too!',
        types: ['style'],
      },
      label: {
        default: true,
        help: `Set true/false to show/hide label or provide a string to display as the label`,
        types: ['boolean', 'string'],
      },
      max: {
        default: 1,
        help: 'Maximum value of the progress element',
        types: ['number'],
      },
      shape: {
        aliases: ['_'],
        default: 'gauge',
        help: `Select ${shapes.slice(0, -1).join(', ')}, or ${shapes.slice(-1)[0]}`,
        options: shapes,
        types: ['string'],
      },
      valueColor: {
        default: `#1785b0`,
        help: 'Color of the progress bar',
        types: ['string'],
      },
      valueWeight: {
        default: 20,
        help: 'Thickness of the progress bar',
        types: ['number'],
      },
    },
    fn: (value, args) => {
      if (args.max <= 0) {
        throw new Error(`Invalid max value: '${args.max}'. 'max' must be greater than 0`);
      }
      if (value > args.max || value < 0) {
        throw new Error(`Invalid value: '${value}'. Value must be between 0 and ${args.max}`);
      }

      let label = '';
      if (args.label) {
        label = typeof args.label === 'string' ? args.label : `${value}`;
      }

      let font: Style = {} as Style;

      if (get(args, 'font.spec')) {
        font = { ...args.font };
        font.spec.fill = args.font.spec.color; // SVG <text> uses fill for font color
      }

      return {
        type: 'render',
        as: 'progress',
        value: {
          value,
          ...args,
          label,
          font,
        },
      };
    },
  };
}
