/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped local
import { Handlebars } from '../../../common/lib/handlebars';
import { ContextFunction, Datatable, Render, Style } from '../types';

type Context = Datatable | null;

interface Arguments {
  expression: string[];
  font: Style;
}

interface Return {
  content: string;
  font: Style;
}

export function markdown(): ContextFunction<'markdown', Context, Arguments, Render<Return>> {
  return {
    name: 'markdown',
    aliases: [],
    type: 'render',
    help:
      'An element for rendering markdown text. Great for single numbers, metrics or paragraphs of text.',
    context: {
      types: ['datatable', 'null'],
    },
    args: {
      expression: {
        aliases: ['_'],
        types: ['string'],
        help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
        default: '""',
        multi: true,
      },
      font: {
        types: ['style'],
        help: 'Font settings. Technically, you can add other styles in here as well',
        default: '{font}',
      },
    },
    fn: (context, args) => {
      const compileFunctions = args.expression.map(str =>
        Handlebars.compile(String(str), { knownHelpersOnly: true })
      );
      const ctx = {
        columns: [],
        rows: [],
        type: null,
        ...context,
      };

      return {
        type: 'render',
        as: 'markdown',
        value: {
          content: compileFunctions.map(fn => fn(ctx)).join(''),
          font: args.font,
        },
      };
    },
  };
}
