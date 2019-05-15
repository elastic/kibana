/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def
import inlineStyle from 'inline-style';
import { openSans } from '../../../common/lib/fonts';
import { getFunctionHelp } from '../../strings';
import {
  CSSStyle,
  FontFamily,
  FontWeight,
  NullContextFunction,
  Style,
  TextAlignment,
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
  const { help, args: argHelp } = getFunctionHelp().font;

  return {
    name: 'font',
    aliases: [],
    type: 'style',
    help,
    context: {
      types: ['null'],
    },
    args: {
      align: {
        default: 'left',
        help: argHelp.align,
        options: TEXT_ALIGNMENTS,
        types: ['string'],
      },
      color: {
        help: argHelp.color,
        types: ['string', 'null'],
      },
      family: {
        default: `"${openSans.value}"`,
        help: argHelp.family,
        types: ['string'],
      },
      italic: {
        default: false,
        help: argHelp.italic,
        options: [true, false],
        types: ['boolean'],
      },
      lHeight: {
        aliases: ['lineHeight'],
        help: argHelp.lHeight,
        types: ['number'],
      },
      size: {
        default: 14,
        help: argHelp.size,
        types: ['number'],
      },
      underline: {
        default: false,
        help: argHelp.underline,
        options: [true, false],
        types: ['boolean'],
      },
      weight: {
        default: 'normal',
        help: argHelp.weight,
        options: Object.values(FontWeight),
        types: ['string'],
      },
    },
    fn: (_context, args) => {
      if (!Object.values(FontWeight).includes(args.weight)) {
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
