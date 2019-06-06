/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

export function browser(): ExpressionFunction<'browser', any, {}, any> {
  const { help } = getFunctionHelp().browser;

  return {
    name: 'browser',
    help,
    args: {},
    fn: context => context,
  };
}
