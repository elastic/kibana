/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def
import inlineStyle from 'inline-style';
import { openSans } from '../../../common/lib/fonts';
import {
  CSSStyle,
  FontFamily,
  FontWeight,
  NullContextFunction,
  Style,
  TextAlignment,
  FONT_WEIGHTS,
  TEXT_ALIGNMENTS,
} from '../types';

interface Arguments {
  align: TextAlignment;
  color: string | null;
  family: FontFamily;
  italic: boolean;
  lHeight: number;
  size: number;
  underline: boolean;
  weight: FontWeight;
}

export function font(): NullContextFunction<'font', Arguments, Style> {
  return {
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
        options: TEXT_ALIGNMENTS,
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
        options: FONT_WEIGHTS,
        types: ['string'],
      },
    },
    fn: (_context, args) => {
      if (!FONT_WEIGHTS.includes(args.weight)) {
        throw new Error(`Invalid font weight: '${args.weight}'`);
      }
      if (!TEXT_ALIGNMENTS.includes(args.align)) {
        throw new Error(`Invalid text alignment: '${args.align}'`);
      }

      // the line height shouldn't ever be lower than the size, and apply as a
      // pixel setting
      const lineHeight = args.lHeight ? `${args.lHeight}px` : 1;

      const spec: CSSStyle = {
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
  };
}
