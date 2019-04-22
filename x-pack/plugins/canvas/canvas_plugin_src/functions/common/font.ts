/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import inlineStyle from 'inline-style';
import { openSans } from '../../../common/lib/fonts';
import { NullContextFunctionFactory } from '../types';

type FontWeight =
  | 'normal'
  | 'bold'
  | 'bolder'
  | 'lighter'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

type Alignment = 'center' | 'left' | 'right' | 'justify';

interface Arguments {
  align: Alignment;
  color: string | null;
  family: string;
  italic: boolean;
  lHeight: number;
  size: number;
  underline: boolean;
  weight: FontWeight;
}

interface StyleSpec {
  color?: string;
  fontFamily: Arguments['family'];
  fontSize: string;
  fontStyle: string;
  fontWeight: Arguments['weight'];
  lineHeight: string;
  textAlign: Arguments['align'];
  textDecoration: string;
}
interface Return {
  css: string;
  spec: StyleSpec;
  type: 'style';
}

const WEIGHTS: FontWeight[] = [
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

const ALIGNMENTS: Alignment[] = ['center', 'left', 'right', 'justify'];

export const font: NullContextFunctionFactory<'font', Arguments, Return> = () => ({
  name: 'font',
  aliases: [],
  type: 'style',
  help: 'Create a font style',
  context: {
    types: ['null'],
  },
  args: {
    align: {
      default: 'left',
      help: 'Horizontal text alignment',
      options: ALIGNMENTS,
      types: ['string'],
    },
    color: {
      help: 'Text color',
      types: ['string', 'null'],
    },
    family: {
      default: `"${openSans.value}"`,
      help: 'An acceptable CSS web font string',
      types: ['string'],
    },
    italic: {
      default: false,
      help: 'Italicize, true or false',
      options: [true, false],
      types: ['boolean'],
    },
    lHeight: {
      aliases: ['lineHeight'],
      help: 'Line height (px)',
      types: ['number'],
    },
    size: {
      default: 14,
      help: 'Font size (px)',
      types: ['number'],
    },
    underline: {
      default: false,
      help: 'Underline the text, true or false',
      options: [true, false],
      types: ['boolean'],
    },
    weight: {
      default: 'normal',
      help:
        'Set the font weight, e.g. normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900',
      options: WEIGHTS,
      types: ['string'],
    },
  },
  fn: (_context, args) => {
    if (!WEIGHTS.includes(args.weight)) {
      throw new Error(`Invalid font weight: '${args.weight}'`);
    }
    if (!ALIGNMENTS.includes(args.align)) {
      throw new Error(`Invalid text alignment: '${args.align}'`);
    }

    // the line height shouldn't ever be lower than the size, and apply as a
    // pixel setting
    const lineHeight = args.lHeight ? `${args.lHeight}px` : '1';

    const spec: StyleSpec = {
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
      textAlign: args.align,
      fontSize: `${args.size}px`, // apply font size as a pixel setting
      lineHeight, // apply line height as a pixel setting
    };

    // conditionally apply styles based on input
    if (args.color) {
      spec.color = args.color;
    }

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
});
