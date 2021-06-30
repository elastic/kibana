/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Datatable,
  Render,
  Style,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/common';
import { parse as parseHandlebars } from '@handlebars/parser';
import { getFunctionHelp } from '../../../i18n';
// @ts-ignore
import { HandlebarsEvaluator } from './handlebars_evaluator';

type Context = Datatable | null;

interface Arguments {
  content: string[];
  font: Style;
  openLinksInNewTab: boolean;
}

export interface Return {
  content: string;
  font: Style;
  openLinksInNewTab: boolean;
}

export function markdown(): ExpressionFunctionDefinition<
  'markdown',
  Context,
  Arguments,
  Promise<Render<Return>>
> {
  const { help, args: argHelp } = getFunctionHelp().markdown;

  return {
    name: 'markdown',
    aliases: [],
    type: 'render',
    help,
    inputTypes: ['datatable', 'null'],
    args: {
      content: {
        aliases: ['_', 'expression'],
        types: ['string'],
        help: argHelp.content,
        default: '""',
        multi: true,
      },
      font: {
        types: ['style'],
        help: argHelp.font,
        default: '{font}',
      },
      openLinksInNewTab: {
        types: ['boolean'],
        help: argHelp.openLinksInNewTab,
        default: false,
      },
    },
    fn: async (input, args) => {
      const ast = parseHandlebars(args.content.join(''));
      const handlebars = new HandlebarsEvaluator(ast);

      return {
        type: 'render',
        as: 'markdown',
        value: {
          content: handlebars.render({
            columns: [],
            rows: [],
            type: null,
            ...input,
          }),
          font: args.font,
          openLinksInNewTab: args.openLinksInNewTab,
        },
      };
    },
  };
}
