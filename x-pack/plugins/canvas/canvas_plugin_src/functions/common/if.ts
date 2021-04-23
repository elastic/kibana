/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  condition: boolean | null;
  then?(): Observable<any>;
  else?(): Observable<any>;
}

export function ifFn(): ExpressionFunctionDefinition<'if', unknown, Arguments, unknown> {
  const { help, args: argHelp } = getFunctionHelp().if;

  return {
    name: 'if',
    help,
    args: {
      condition: {
        types: ['boolean'],
        aliases: ['_'],
        help: argHelp.condition,
        required: true,
      },
      then: {
        resolve: false,
        help: argHelp.then!,
      },
      else: {
        resolve: false,
        help: argHelp.else!,
      },
    },
    fn: async (input, args) => {
      if (args.condition) {
        return args.then?.().pipe(take(1)).toPromise() ?? input;
      } else {
        return args.else?.().pipe(take(1)).toPromise() ?? input;
      }
    },
  };
}
