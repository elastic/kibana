/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, combineLatest, defer } from 'rxjs';
import { map } from 'rxjs';
import { Datatable, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  fn: (datatable: Datatable) => Observable<boolean>;
}

export function filterrows(): ExpressionFunctionDefinition<
  'filterrows',
  Datatable,
  Arguments,
  Observable<Datatable>
> {
  const { help, args: argHelp } = getFunctionHelp().filterrows;

  return {
    name: 'filterrows',
    aliases: [],
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      fn: {
        resolve: false,
        aliases: ['_', 'exp', 'expression', 'function'],
        types: ['boolean'],
        required: true,
        help: argHelp.fn,
      },
    },
    fn(input, { fn }) {
      return defer(() =>
        combineLatest(input.rows.map((row) => fn({ ...input, rows: [row] })))
      ).pipe(
        map((checks) => input.rows.filter((row, i) => checks[i])),
        map((rows) => ({ ...input, rows }))
      );
    },
  };
}
