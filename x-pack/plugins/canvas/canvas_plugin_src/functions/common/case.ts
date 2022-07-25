/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, defer, isObservable, of } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  when?(): Observable<any>;
  if?: boolean;
  then(): Observable<any>;
}

interface Case {
  type: 'case';
  matches: boolean;
  result: any;
}

export function caseFn(): ExpressionFunctionDefinition<'case', any, Arguments, Observable<Case>> {
  const { help, args: argHelp } = getFunctionHelp().case;

  return {
    name: 'case',
    type: 'case',
    help,
    args: {
      when: {
        aliases: ['_'],
        resolve: false,
        help: argHelp.when!,
      },
      if: {
        types: ['boolean'],
        help: argHelp.if!,
      },
      then: {
        resolve: false,
        required: true,
        help: argHelp.then!,
      },
    },
    fn(input, { if: condition, then, when }) {
      return defer(() => {
        const matches = condition ?? when?.().pipe(map((value) => value === input)) ?? true;

        return isObservable(matches) ? matches : of(matches);
      }).pipe(
        concatMap((matches) =>
          (matches ? then() : of(null)).pipe(
            map(
              (result): Case => ({
                matches,
                result,
                type: 'case',
              })
            )
          )
        )
      );
    },
  };
}
