/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

type Input = number | string;

interface Arguments {
  value: Input;
}

export function gt(): ExpressionFunctionDefinition<'gt', Input, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().gt;

  return {
    name: 'gt',
    type: 'boolean',
    inputTypes: ['number', 'string'],
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['number', 'string'],
        required: true,
        help: argHelp.value,
      },
    },
    fn: (input, args) => {
      const { value } = args;

      if (typeof input !== typeof value) {
        return false;
      }

      return input > value;
    },
  };
}
