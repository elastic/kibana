/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';


export function mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreen) {
  const currentState$ = Rx
    .of({
      state: upstreamStatus.state,
      message: upstreamStatus.message,
    });

  const newState$ = Rx
    .fromEvent(upstreamStatus, 'change', null, (previousState, previousMsg, state, message) => {
      return {
        state,
        message,
      };
    });

  const state$ = Rx.merge(currentState$, newState$);

  let onGreenPromise;
  const onGreen$ = Rx.Observable.create(observer => {
    if (!onGreenPromise) {
      onGreenPromise = onGreen();
    }

    onGreenPromise
      .then(() => {
        observer.next({
          state: 'green',
          message: 'Ready',
        });
      })
      .catch((err) => {
        onGreenPromise = null;
        observer.next({
          state: 'red',
          message: err.message
        });
      });
  });


  state$
    .pipe(
      switchMap(({ state, message }) => {
        if (state !== 'green') {
          return Rx.of({ state, message });
        }

        return onGreen$;
      }),
      tap(({ state, message }) => {
        downstreamStatus[state](message);
      })
    )
    .subscribe();
}
