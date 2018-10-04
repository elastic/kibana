/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const replace = () => ({
  name: 'replace',
  type: 'string',
  help: i18n.translate('xpack.canvas.functions.replaceHelpText', {
    defaultMessage: 'Use a regular expression to replace parts of a string',
  }),
  context: {
    types: ['string'],
  },
  args: {
    pattern: {
      aliases: ['_', 'regex'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.replace.argsPatternHelpText', {
        defaultMessage:
          'The text or pattern of a JavaScript regular expression, eg "[aeiou]". You can use capture groups here.',
      }),
    },
    flags: {
      aliases: ['modifiers'],
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.replace.argsFlagsHelpText', {
        defaultMessage:
          'Specify flags. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp for reference.',
      }),
      default: 'g',
    },
    replacement: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.replace.argsReplacementHelpText', {
        defaultMessage:
          'The replacement for the matching parts of string. Capture groups can be accessed by their index, eg $1',
      }),
      default: '""',
    },
  },
  fn: (context, args) => context.replace(new RegExp(args.pattern, args.flags), args.replacement),
});
