/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';

const BOOLEAN_TRUE = 'true';

interface Arguments {
  condition: boolean[];
}

const getHelpText = () =>
  i18n.translate('xpack.canvas.functions.allHelpText', {
    defaultMessage: 'Returns {BOOLEAN_TRUE} if all of the conditions are met. See also {anyFn}.',
    values: {
      anyFn: '`any`',
      BOOLEAN_TRUE,
    },
  });

const getConditionArgHelp = () =>
  i18n.translate('xpack.canvas.functions.allHelpText', {
    defaultMessage: 'Returns {BOOLEAN_TRUE} if all of the conditions are met. See also {anyFn}.',
    values: {
      anyFn: '`any`',
      BOOLEAN_TRUE,
    },
  });

export function all(): ExpressionFunctionDefinition<'all', null, Arguments, boolean> {
  return {
    name: 'all',
    type: 'boolean',
    help: getHelpText(),
    inputTypes: ['null'],
    args: {
      condition: {
        aliases: ['_'],
        types: ['boolean'],
        help: getConditionArgHelp(),
        required: true,
        multi: true,
      },
    },
    fn: (input, args) => {
      const conditions = args.condition || [];
      return conditions.every(Boolean);
    },
  };
}
