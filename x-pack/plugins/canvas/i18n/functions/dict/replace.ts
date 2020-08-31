/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { replace } from '../../../canvas_plugin_src/functions/common/replace';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { JS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof replace>> = {
  help: i18n.translate('xpack.canvas.functions.replaceImageHelpText', {
    defaultMessage: 'Uses a regular expression to replace parts of a string.',
  }),
  args: {
    pattern: i18n.translate('xpack.canvas.functions.replace.args.patternHelpText', {
      defaultMessage:
        'The text or pattern of a {JS} regular expression. For example, {example}. You can use capturing groups here.',
      values: {
        JS,
        example: '`"[aeiou]"`',
      },
    }),
    flags: i18n.translate('xpack.canvas.functions.replace.args.flagsHelpText', {
      defaultMessage: 'Specify flags. See {url}.',
      values: {
        url:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
      },
    }),
    replacement: i18n.translate('xpack.canvas.functions.replace.args.replacementHelpText', {
      defaultMessage:
        'The replacement for the matching parts of string. Capturing groups can be accessed by their index. For example, {example}.',
      values: {
        example: '`"$1"`',
      },
    }),
  },
};
