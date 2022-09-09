/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, defaultIfEmpty, defer, of, switchMap } from 'rxjs';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Case } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  case: Array<() => Observable<Case>>;
  default?(): Observable<any>;
}

export function switchFn(): ExpressionFunctionDefinition<
  'switch',
  unknown,
  Arguments,
  Observable<unknown>
> {
  const { help, args: argHelp } = getFunctionHelp().switch;

  return {
    name: 'switch',
    help,
    args: {
      case: {
        types: ['case'],
        aliases: ['_'],
        resolve: false,
        multi: true,
        required: true,
        help: argHelp.case!,
      },
      default: {
        aliases: ['finally'],
        resolve: false,
        help: argHelp.default!,
      },
    },
    fn: function fn(input, args): Observable<unknown> {
      return defer(() => {
        if (!args.case.length) {
          return args.default?.() ?? of(input);
        }

        const [head$, ...tail$] = args.case;

        return head$().pipe(
          defaultIfEmpty(undefined),
          switchMap((value) =>
            value?.matches ? of(value.result) : fn(input, { ...args, case: tail$ })
          )
        );
      });
    },
  };
}
