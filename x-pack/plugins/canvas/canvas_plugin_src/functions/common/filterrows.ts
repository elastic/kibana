/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Datatable, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  fn: (datatable: Datatable) => Observable<boolean>;
}

export function filterrows(): ExpressionFunctionDefinition<
  'filterrows',
  Datatable,
  Arguments,
  Promise<Datatable>
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
      const checks = input.rows.map((row) =>
        fn({
          ...input,
          rows: [row],
        })
          .pipe(take(1))
          .toPromise()
      );

      return Promise.all(checks)
        .then((results) => input.rows.filter((row, i) => results[i]))
        .then(
          (rows) =>
            ({
              ...input,
              rows,
            } as Datatable)
        );
    },
  };
}
