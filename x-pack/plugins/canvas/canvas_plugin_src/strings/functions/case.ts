/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { caseFn } from '../../functions/common/case';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof caseFn>> = {
  help: i18n.translate('xpack.canvas.functions.caseHelpText', {
    defaultMessage: 'Build a case (including a condition/result) to pass to the {switch} function',
    values: {
      switch: 'switch',
    },
  }),
  args: {
    if: i18n.translate('xpack.canvas.functions.case.args.ifHelpText', {
      defaultMessage:
        'This value is used as whether or not the condition is met. It overrides the unnamed argument if both are provided.',
    }),
    when: i18n.translate('xpack.canvas.functions.case.args.whenHelpText', {
      defaultMessage:
        'This value is compared to the context to see if the condition is met. It is overridden by the "{if}" argument if both are provided.',
      values: {
        if: 'if',
      },
    }),
    then: i18n.translate('xpack.canvas.functions.case.args.thenHelpText', {
      defaultMessage: 'The value to return if the condition is met',
    }),
  },
};
