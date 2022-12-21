/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

export function clear(): ExpressionFunctionDefinition<'clear', any, {}, null> {
  const { help } = getFunctionHelp().clear;

  return {
    name: 'clear',
    type: 'null',
    inputTypes: ['null'],
    help,
    args: {},
    fn: () => null,
  };
}
