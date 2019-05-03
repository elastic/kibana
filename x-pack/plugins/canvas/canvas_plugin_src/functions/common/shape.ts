/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NullContextFunction } from '../types';

export type Shape =
  | 'arrow'
  | 'arrowMulti'
  | 'bookmark'
  | 'circle'
  | 'cross'
  | 'hexagon'
  | 'kite'
  | 'pentagon'
  | 'rhombus'
  | 'semicircle'
  | 'speechBubble'
  | 'square'
  | 'star'
  | 'tag'
  | 'triangle'
  | 'triangleRight';

interface Arguments {
  border: string | null;
  borderWidth: number | null;
  shape: Shape | null;
  fill: string | null;
  maintainAspect: boolean;
}

interface Return extends Arguments {
  type: 'shape';
}

const OPTIONS: Shape[] = [
  'arrow',
  'arrowMulti',
  'bookmark',
  'circle',
  'cross',
  'hexagon',
  'kite',
  'pentagon',
  'rhombus',
  'semicircle',
  'speechBubble',
  'square',
  'star',
  'tag',
  'triangle',
  'triangleRight',
];

export function shape(): NullContextFunction<'shape', Arguments, Return> {
  return {
    name: 'shape',
    aliases: [],
    type: 'shape',
    help: 'Create a shape',
    context: {
      types: ['null'],
    },
    args: {
      border: {
        types: ['string', 'null'],
        aliases: ['stroke'],
        help: 'Valid CSS color string',
      },
      borderWidth: {
        types: ['number', 'null'],
        aliases: ['strokeWidth'],
        help: 'Thickness of the border',
        default: '0',
      },
      shape: {
        types: ['string', 'null'],
        help: 'Pick a shape',
        aliases: ['_'],
        default: 'square',
        options: OPTIONS,
      },
      fill: {
        types: ['string', 'null'],
        help: 'Valid CSS color string',
        default: 'black',
      },
      maintainAspect: {
        types: ['boolean'],
        help: 'Select true to maintain aspect ratio',
        default: false,
        options: [true, false],
      },
    },
    fn: (_context, args) => ({
      type: 'shape',
      ...args,
    }),
  };
}
