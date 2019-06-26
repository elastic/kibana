/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ifFn } from '../../functions/common/if';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof ifFn>> = {
  help: i18n.translate('xpack.canvas.functions.ifHelpText', {
    defaultMessage: 'Perform conditional logic',
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.if.args.conditionHelpText', {
      defaultMessage:
        'A `true` or `false` indicating whether a condition is met, ' +
        'usually returned by a sub-expression. When unspecified, the original {context} is returned.',
      values: {
        context: '_context_',
      },
    }),
    then: i18n.translate('xpack.canvas.functions.if.args.thenHelpText', {
      defaultMessage:
        'The return value if the condition is `true`. ' +
        'When unspecified and the condition is met, the original {context} is returned.',
      values: {
        context: '_context_',
      },
    }),
    else: i18n.translate('xpack.canvas.functions.if.args.elseHelpText', {
      defaultMessage:
        'The return value if the condition is `false`. ' +
        'When unspecified and the condition is not met, the original {context} is returned.',
      values: {
        context: '_context_',
      },
    }),
  },
};
