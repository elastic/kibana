/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped local
import { palettes } from '../../../common/lib/palettes';
import { NullContextFunction } from '../types';

interface Arguments {
  color: string[];
  gradient: boolean;
  reverse: boolean;
}

interface Return {
  type: 'palette';
  colors: string[];
  gradient: boolean;
}

export function palette(): NullContextFunction<'palette', Arguments, Return> {
  return {
    name: 'palette',
    aliases: [],
    type: 'palette',
    help: 'Create a color palette',
    context: {
      types: ['null'],
    },
    args: {
      color: {
        aliases: ['_'],
        multi: true,
        types: ['string'],
        help: 'Palette colors, rgba, hex, or HTML color string. Pass this multiple times.',
      },
      gradient: {
        types: ['boolean'],
        default: false,
        help: 'Prefer to make a gradient where supported and useful?',
        options: [true, false],
      },
      reverse: {
        types: ['boolean'],
        default: false,
        help: 'Reverse the palette',
        options: [true, false],
      },
    },
    fn: (_context, args) => {
      const { color, reverse, gradient } = args;
      const colors = ([] as string[]).concat(color || palettes.paul_tor_14.colors);

      return {
        type: 'palette',
        colors: reverse ? colors.reverse() : colors,
        gradient,
      };
    },
  };
}
