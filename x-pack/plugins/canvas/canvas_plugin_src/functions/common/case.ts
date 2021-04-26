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
  when?(): Observable<any>;
  if?: boolean;
  then?(): Observable<any>;
}

interface Case {
  type: 'case';
  matches: boolean;
  result: any;
}

export function caseFn(): ExpressionFunctionDefinition<'case', any, Arguments, Promise<Case>> {
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
    fn: async (input, args) => {
      const matches = await doesMatch(input, args);
      const result = matches ? await getResult(input, args) : null;
      return { type: 'case', matches, result };
    },
  };
}

async function doesMatch(context: any, args: Arguments) {
  if (typeof args.if !== 'undefined') {
    return args.if;
  }
  if (typeof args.when !== 'undefined') {
    return (await args.when().pipe(take(1)).toPromise()) === context;
  }
  return true;
}

async function getResult(context: any, args: Arguments) {
  return args.then?.().pipe(take(1)).toPromise() ?? context;
}
