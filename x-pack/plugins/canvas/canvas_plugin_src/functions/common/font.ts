/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def
import inlineStyle from 'inline-style';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { openSans } from '../../../common/lib/fonts';
import { getFunctionHelp, getFunctionErrors } from '../../strings';
import {
  CSSStyle,
  FontFamily,
  FontWeight,
  TextDecoration,
  Style,
  TextAlignment,
  FontStyle,
} from '../types';

interface Arguments {
  align: TextAlignment;
  color: string;
  family: FontFamily;
  italic: boolean;
  lHeight: number | null;
  size: number;
  underline: boolean;
  weight: FontWeight;
}

export function font(): ExpressionFunction<'font', null, Arguments, Style> {
  const { help, args: argHelp } = getFunctionHelp().font;
  const errors = getFunctionErrors().font;

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
        options: Object.values(TextAlignment),
        types: ['string'],
      },
      color: {
        help: argHelp.color,
        types: ['string'],
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
        types: ['number', 'null'],
      },
      size: {
        types: ['number'],
        default: 14,
        help: argHelp.size,
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
        throw errors.invalidFontWeight(args.weight);
      }
      if (!Object.values(TextAlignment).includes(args.align)) {
        throw errors.invalidTextAlignment(args.align);
      }

      // the line height shouldn't ever be lower than the size, and apply as a
      // pixel setting
      const lineHeight = args.lHeight != null ? `${args.lHeight}px` : '1';

      const spec: CSSStyle = {
        fontFamily: args.family,
        fontWeight: args.weight,
        fontStyle: args.italic ? FontStyle.ITALIC : FontStyle.NORMAL,
        textDecoration: args.underline ? TextDecoration.UNDERLINE : TextDecoration.NONE,
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
