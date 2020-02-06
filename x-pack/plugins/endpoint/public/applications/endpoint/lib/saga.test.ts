/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSagaMiddleware, SagaContext, SagaMiddleware } from './index';
import { applyMiddleware, createStore, Reducer, Store } from 'redux';

describe('saga', () => {
  const INCREMENT_COUNTER = 'INCREMENT';
  const DELAYED_INCREMENT_COUNTER = 'DELAYED INCREMENT COUNTER';
  const STOP_SAGA_PROCESSING = 'BREAK ASYNC ITERATOR';

  const sleep = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
  let store: Store;
  let reducerA: Reducer;
  let sideAffect: (a: unknown, s: unknown) => void;
  let sagaExe: (sagaContext: SagaContext) => Promise<void>;
  let sagaExeReduxMiddleware: SagaMiddleware;

  beforeEach(() => {
    reducerA = jest.fn((prevState = { count: 0 }, { type }) => {
      switch (type) {
        case INCREMENT_COUNTER:
          return { ...prevState, count: prevState.count + 1 };
        default:
          return prevState;
      }
    });

    sideAffect = jest.fn();

    sagaExe = jest.fn(async ({ actionsAndState, dispatch }: SagaContext) => {
      for await (const { action, state } of actionsAndState()) {
        expect(action).toBeDefined();
        expect(state).toBeDefined();

        if (action.type === STOP_SAGA_PROCESSING) {
          break;
        }

        sideAffect(action, state);

        if (action.type === DELAYED_INCREMENT_COUNTER) {
          await sleep(1);
          dispatch({
            type: INCREMENT_COUNTER,
          });
        }
      }
    });

    sagaExeReduxMiddleware = createSagaMiddleware(sagaExe);
    store = createStore(reducerA, applyMiddleware(sagaExeReduxMiddleware));
  });

  afterEach(() => {
    sagaExeReduxMiddleware.stop();
  });

  test('it does nothing if saga is not started', () => {
    expect(sagaExe).not.toHaveBeenCalled();
  });

  test('it can dispatch store actions once running', async () => {
    sagaExeReduxMiddleware.start();
    expect(store.getState()).toEqual({ count: 0 });
    expect(sagaExe).toHaveBeenCalled();

    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    expect(store.getState()).toEqual({ count: 0 });

    await sleep();

    expect(sideAffect).toHaveBeenCalled();
    expect(store.getState()).toEqual({ count: 1 });
  });

  test('it stops processing if break out of loop', async () => {
    sagaExeReduxMiddleware.start();
    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    await sleep();

    expect(store.getState()).toEqual({ count: 1 });
    expect(sideAffect).toHaveBeenCalledTimes(2);

    store.dispatch({ type: STOP_SAGA_PROCESSING });
    await sleep();

    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    await sleep();

    expect(store.getState()).toEqual({ count: 1 });
    expect(sideAffect).toHaveBeenCalledTimes(2);
  });

  test('it stops saga middleware when stop() is called', async () => {
    sagaExeReduxMiddleware.start();
    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    await sleep();

    expect(store.getState()).toEqual({ count: 1 });
    expect(sideAffect).toHaveBeenCalledTimes(2);

    sagaExeReduxMiddleware.stop();

    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    await sleep();

    expect(store.getState()).toEqual({ count: 1 });
    expect(sideAffect).toHaveBeenCalledTimes(2);
  });
});
