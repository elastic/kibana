/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
// @ts-ignore untyped local
import { palettes } from '../../../common/lib/palettes';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  color: string[];
  gradient: boolean;
  reverse: boolean;
}

interface Output {
  type: 'palette';
  colors: string[];
  gradient: boolean;
}

export function palette(): ExpressionFunctionDefinition<'palette', null, Arguments, Output> {
  const { help, args: argHelp } = getFunctionHelp().palette;

  return {
    name: 'palette',
    aliases: [],
    type: 'palette',
    inputTypes: ['null'],
    help,
    args: {
      color: {
        aliases: ['_'],
        multi: true,
        types: ['string'],
        help: argHelp.color,
      },
      gradient: {
        types: ['boolean'],
        default: false,
        help: argHelp.gradient,
        options: [true, false],
      },
      reverse: {
        types: ['boolean'],
        default: false,
        help: argHelp.reverse,
        options: [true, false],
      },
    },
    fn: (input, args) => {
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
