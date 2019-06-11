/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

export function rowCount(): ExpressionFunction<'rowCount', Datatable, {}, number> {
  const { help } = getFunctionHelp().rowCount;

  return {
    name: 'rowCount',
    aliases: [],
    type: 'number',
    help,
    context: {
      types: ['datatable'],
    },
    args: {},
    fn: context => context.rows.length,
  };
}
