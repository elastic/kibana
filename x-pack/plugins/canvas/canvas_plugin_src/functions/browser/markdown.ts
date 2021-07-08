/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Datatable,
  Style,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from 'src/plugins/expressions/common';

import { i18n } from '@kbn/i18n';
import { MARKDOWN, CSS } from '../../../i18n/constants';

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

const help = i18n.translate('xpack.canvas.functions.markdownHelpText', {
  defaultMessage:
    'Adds an element that renders {MARKDOWN} text. TIP: Use the {markdownFn} function for single numbers, metrics, and paragraphs of text.',
  values: {
    MARKDOWN,
    markdownFn: '`markdown`',
  },
});

const argHelp = {
  content: i18n.translate('xpack.canvas.functions.markdown.args.contentHelpText', {
    defaultMessage:
      'A string of text that contains {MARKDOWN}. To concatenate, pass the {stringFn} function multiple times.',
    values: {
      MARKDOWN,
      stringFn: '`string`',
    },
  }),
  font: i18n.translate('xpack.canvas.functions.markdown.args.fontHelpText', {
    defaultMessage:
      'The {CSS} font properties for the content. For example, {fontFamily} or {fontWeight}.',
    values: {
      CSS,
      fontFamily: '"font-family"',
      fontWeight: '"font-weight"',
    },
  }),
  openLinksInNewTab: i18n.translate('xpack.canvas.functions.markdown.args.openLinkHelpText', {
    defaultMessage:
      'A true or false value for opening links in a new tab. The default value is `false`. Setting to `true` opens all links in a new tab.',
  }),
};

export function markdown(): ExpressionFunctionDefinition<
  'markdown',
  Context,
  Arguments,
  Promise<ExpressionValueRender<Return>>
> {
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
    fn: async (input, args, context) => {
      const { markdownFn } = await import('./fns');
      return await markdownFn(input, args, context);
    },
  };
}
