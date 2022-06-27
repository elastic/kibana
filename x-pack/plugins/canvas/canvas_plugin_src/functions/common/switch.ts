/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, combineLatest, defer, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
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
    fn(input, args) {
      return combineLatest(args.case.map((item) => defer(() => item()))).pipe(
        concatMap((items) => {
          const item = items.find(({ matches }) => matches);
          const item$ = item && of(item.result);

          return item$ ?? args.default?.() ?? of(input);
        })
      );
    },
  };
}
