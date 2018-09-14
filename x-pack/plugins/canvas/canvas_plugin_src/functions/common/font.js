/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import inlineStyle from 'inline-style';
import { openSans } from '../../../common/lib/fonts';

const weights = [
  'normal',
  'bold',
  'bolder',
  'lighter',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
];
const alignments = ['center', 'left', 'right', 'justify'];

export const font = () => ({
  name: 'font',
  aliases: [],
  type: 'style',
  help: 'Create a font style',
  context: {
    types: ['null'],
  },
  args: {
    size: {
      types: ['number'],
      help: 'Font size (px)',
      default: 14,
    },
    lHeight: {
      types: ['number'],
      aliases: ['lineHeight'],
      help: 'Line height (px)',
    },
    family: {
      types: ['string'],
      default: `"${openSans.value}"`,
      help: 'An acceptable CSS web font string',
    },
    color: {
      types: ['string', 'null'],
      help: 'Text color',
    },
    weight: {
      types: ['string'],
      help:
        'Set the font weight, e.g. normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900',
      default: 'normal',
      options: weights,
    },
    underline: {
      types: ['boolean'],
      default: false,
      help: 'Underline the text, true or false',
      options: [true, false],
    },
    italic: {
      types: ['boolean'],
      default: false,
      help: 'Italicize, true or false',
      options: [true, false],
    },
    align: {
      types: ['string'],
      help: 'Horizontal text alignment',
      default: 'left',
      options: alignments,
    },
  },
  fn: (context, args) => {
    if (!weights.includes(args.weight)) throw new Error(`Invalid font weight: ${args.weight}`);
    if (!alignments.includes(args.align)) throw new Error(`Invalid text alignment: ${args.align}`);

    // the line height shouldn't ever be lower than the size
    const lineHeight = args.lHeight ? `${args.lHeight}px` : 1;

    const spec = {
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
      textAlign: args.align,
      fontSize: `${args.size}px`, // apply font size as a pixel setting
      lineHeight: lineHeight, // apply line height as a pixel setting
    };

    // conditionally apply styles based on input
    if (args.color) spec.color = args.color;

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
});
