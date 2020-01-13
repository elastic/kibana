/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, MiddlewareAPI } from 'redux';
import { ActionsObservable, Epic } from 'redux-observable';
import { Observable } from 'rxjs';

declare module 'redux-observable' {
  function combineEpics<
    T1 extends Action,
    T2 extends Action,
    O1 extends T1,
    O2 extends T2,
    S,
    D1,
    D2
  >(epic1: Epic<T1, O1, S, D1>, epic2: Epic<T2, O2, S, D2>): Epic<T1 | T2, O1 | O2, S, D1 & D2>;
  function combineEpics<
    T1 extends Action,
    T2 extends Action,
    T3 extends Action,
    O1 extends T1,
    O2 extends T2,
    O3 extends T3,
    S,
    D1,
    D2,
    D3
  >(
    epic1: Epic<T1, O1, S, D1>,
    epic2: Epic<T2, O2, S, D2>,
    epic3: Epic<T3, O3, S, D3>
  ): Epic<T1 | T2 | T3, O1 | O2 | O3, S, D1 & D2 & D3>;
  function combineEpics<
    T1 extends Action,
    T2 extends Action,
    T3 extends Action,
    T4 extends Action,
    O1 extends T1,
    O2 extends T2,
    O3 extends T3,
    O4 extends T4,
    S,
    D1,
    D2,
    D3,
    D4
  >(
    epic1: Epic<T1, O1, S, D1>,
    epic2: Epic<T2, O2, S, D2>,
    epic3: Epic<T3, O3, S, D3>,
    epic4: Epic<T4, O4, S, D4>
  ): Epic<T1 | T2 | T3 | T4, O1 | O2 | O3 | O4, S, D1 & D2 & D3 & D4>;
  function combineEpics<
    T1 extends Action,
    T2 extends Action,
    T3 extends Action,
    T4 extends Action,
    T5 extends Action,
    O1 extends T1,
    O2 extends T2,
    O3 extends T3,
    O4 extends T4,
    O5 extends T5,
    S,
    D1,
    D2,
    D3,
    D4,
    D5
  >(
    epic1: Epic<T1, O1, S, D1>,
    epic2: Epic<T2, O2, S, D2>,
    epic3: Epic<T3, O3, S, D3>,
    epic4: Epic<T4, O4, S, D4>,
    epic5: Epic<T5, O5, S, D5>
  ): Epic<T1 | T2 | T3 | T4 | T5, O1 | O2 | O3 | O4 | O5, S, D1 & D2 & D3 & D4 & D5>;

  type EpicWithState<E, S> = E extends Epic<infer In, infer Out, null, infer Deps>
    ? Epic<In, Out, S, Deps>
    : E;
}
