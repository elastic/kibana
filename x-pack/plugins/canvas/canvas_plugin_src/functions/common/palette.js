/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { palettes } from '../../../common/lib/palettes';
export const palette = () => ({
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
      type: ['boolean'],
      default: false,
      help: 'Reverse the palette',
      options: [true, false],
    },
  },
  fn: (context, args) => {
    const colors = [].concat(args.color || palettes.paul_tor_14.colors);
    return {
      type: 'palette',
      colors: args.reverse ? colors.reverse() : colors,
      gradient: args.gradient,
    };
  },
});
