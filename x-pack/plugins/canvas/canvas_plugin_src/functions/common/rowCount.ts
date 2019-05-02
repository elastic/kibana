/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ContextFunction, Datatable } from '../types';

export function rowCount(): ContextFunction<'rowCount', Datatable, {}, number> {
  return {
    name: 'rowCount',
    aliases: [],
    type: 'number',
    context: {
      types: ['datatable'],
    },
    help:
      'Return the number of rows. Pair with ply to get the count of unique column values, or combinations of unique column values.',
    args: {},
    fn: context => context.rows.length,
  };
}
