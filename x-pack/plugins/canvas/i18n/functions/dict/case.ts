/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { caseFn } from '../../../canvas_plugin_src/functions/common/case';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

const IF_ARG = '`if`';
const WHEN_ARG = '`when`';

export const help: FunctionHelp<FunctionFactory<typeof caseFn>> = {
  help: i18n.translate('xpack.canvas.functions.caseHelpText', {
    defaultMessage:
      'Builds a {case}, including a condition and a result, to pass to the {switchFn} function.',
    values: {
      case: '`case`',
      switchFn: '`switch`',
    },
  }),
  args: {
    when: i18n.translate('xpack.canvas.functions.case.args.whenHelpText', {
      defaultMessage:
        'The value compared to the {CONTEXT} to see if they are equal. The {WHEN_ARG} argument is ignored when the {IF_ARG} argument is also specified.',
      values: {
        CONTEXT,
        IF_ARG,
        WHEN_ARG,
      },
    }),
    if: i18n.translate('xpack.canvas.functions.case.args.ifHelpText', {
      defaultMessage:
        'This value indicates whether the condition is met, usually using a sub-expression. The {IF_ARG} argument overrides the {WHEN_ARG} argument when both are provided.',
      values: {
        IF_ARG,
        WHEN_ARG,
      },
    }),
    then: i18n.translate('xpack.canvas.functions.case.args.thenHelpText', {
      defaultMessage: 'The value to return if the condition is met.',
    }),
  },
};
