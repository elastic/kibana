/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ContextFunction, Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

export function rowCount(): ContextFunction<'rowCount', Datatable, {}, number> {
  const { help } = getFunctionHelp().rowCount;

  return {
    name: 'rowCount',
    aliases: [],
    type: 'number',
    context: {
      types: ['datatable'],
    },
    help,
    args: {},
    fn: context => context.rows.length,
  };
}
