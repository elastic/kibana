/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
import { Observable } from 'rxjs';

export function mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreen) {
  const currentState$ = Observable
    .of({
      state: upstreamStatus.state,
      message: upstreamStatus.message,
    });

  const newState$ = Observable
    .fromEvent(upstreamStatus, 'change', null, (previousState, previousMsg, state, message) => {
      return {
        state,
        message,
      };
    });

  const state$ = Observable.merge(currentState$, newState$);


  state$
    .switchMap(({ state, message }) => {
      if (state !== 'green') {
        return Observable.of({ state, message });
      }

      return Observable.create(observer => {
        onGreen()
          .then(() => {
            observer.next({
              state: 'green',
              message: 'Ready',
            });
          })
          .catch((err) => {
            observer.next({
              state: 'red',
              message: err.message
            });
          });
      });
    })
    .do(({ state, message }) => {
      downstreamStatus[state](message);
    })
    .subscribe();
}
