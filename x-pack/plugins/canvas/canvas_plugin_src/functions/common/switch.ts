/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, defer, from, of } from 'rxjs';
import { concatMap, filter, merge, pluck, take } from 'rxjs/operators';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { Case } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  case?: Array<() => Observable<Case>>;
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
    fn(input, args) {
      return from(args.case ?? []).pipe(
        concatMap((item) => item()),
        filter(({ matches }) => matches),
        pluck('result'),
        merge(defer(() => args.default?.() ?? of(input))),
        take(1)
      );
    },
  };
}
