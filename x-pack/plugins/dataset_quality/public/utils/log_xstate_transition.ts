/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */

import { ActionObject, ActionTypes, ActivityActionObject, EventObject, State } from 'xstate';
import { useEffect, useState } from 'react';
import { ReplaySubject, EMPTY, expand, merge } from 'rxjs';

export const logXStateTransition = (state: State<any, any, any, any, any>) => {
  console.group(
    `%c${state.machine?.id} %cevent %c${state.event.type}: %c${state.history?.value}%c ⟶ %c${state.value}`,
    'font-weight: bold;',
    'color: gray; font-weight: lighter;',
    '',
    'text-decoration: underline;',
    '',
    'text-decoration: underline;'
  );
  console.log(
    '%cprev state',
    'color: #9E9E9E; font-weight: bold;',
    state.history?.value,
    state.history
  );
  console.log('%cevent', 'color: #03A9F4; font-weight: bold;', state.event);
  console.log('%cnext state', 'color: #4CAF50; font-weight: bold;', state.value, state);
  console.groupEnd();
};

export const useDeepXStateLogger = () => {
  const [deepLogger] = useState(() => {
    const observer = new ReplaySubject<State<any, any, any, any, any>>();

    const state$ = observer.pipe(
      expand((state) => {
        if (state.actions == null) {
          return EMPTY;
        }

        return merge(
          ...state.actions
            .filter(isActivityAction)
            .flatMap((action) =>
              action.activity?.type === 'xstate.invoke'
                ? state.children[action.activity.id] ?? []
                : []
            )
            .filter((child) => 'machine' in child)
        );
      })
    );

    return { observer, state$ };
  });

  useEffect(() => {
    const subscription = deepLogger.state$.subscribe(logXStateTransition);

    return () => {
      subscription.unsubscribe();
    };
  }, [deepLogger.state$]);

  return deepLogger.observer;
};

const isActivityAction = <C, E extends EventObject>(
  action: ActionObject<C, E>
): action is ActivityActionObject<C, E> => action.type === ActionTypes.Start;
