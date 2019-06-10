/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { markdown } from '../../functions/browser/markdown';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof markdown>> = {
  help: i18n.translate('xpack.canvas.functions.markdownHelpText', {
    defaultMessage:
      'An element for rendering {markdown} text. Great for single numbers, metrics or paragraphs of text.',
    values: {
      markdown: 'markdown',
    },
  }),
  args: {
    content: i18n.translate('xpack.canvas.functions.markdown.args.contentHelpText', {
      defaultMessage:
        'A {markdown} expression. You can pass this multiple times to achieve concatenation',
      values: {
        markdown: 'markdown',
      },
    }),
    font: i18n.translate('xpack.canvas.functions.markdown.args.fontHelpText', {
      defaultMessage: 'Font settings. Technically, you can add other styles in here as well',
    }),
  },
};
