/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createSagaMiddleware, SagaContext } from './index';
import { applyMiddleware, createStore, Reducer } from 'redux';

// TODO: follow up - middleware seems to be running AFTER reducers - is this correct? I thought it was suppose to be before (ref: https://redux.js.org/advanced/middleware )

describe('saga', () => {
  const INCREMENT_COUNTER = 'INCREMENT';
  const DELAYED_INCREMENT_COUNTER = 'DELAYED INCREMENT COUNTER';

  const sleep = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));
  let reducerA: Reducer;
  let sagaExe: (sagaContext: SagaContext) => Promise<void>;

  beforeEach(() => {
    reducerA = jest.fn((prevState = { count: 0 }, { type }) => {
      switch (type) {
        case INCREMENT_COUNTER:
          return { ...prevState, count: prevState.count + 1 };
        default:
          return prevState;
      }
    });

    sagaExe = jest.fn(async ({ actionsAndState, dispatch }: SagaContext) => {
      for await (const { action, state } of actionsAndState()) {
        expect(action).toBeDefined();
        expect(state).toBeDefined();

        if (action.type === DELAYED_INCREMENT_COUNTER) {
          await sleep(1);
          dispatch({
            type: INCREMENT_COUNTER,
          });
        }
      }
    });
  });

  test('it returns Redux Middleware from createSagaMiddleware()', () => {
    const sagaMiddleware = createSagaMiddleware(async () => {});
    expect(sagaMiddleware).toBeInstanceOf(Function);
    expect(sagaMiddleware.run).toBeInstanceOf(Function);
  });
  test('it does nothing if saga is not started', () => {
    const store = createStore(reducerA, applyMiddleware(createSagaMiddleware(sagaExe)));
    expect(store.getState().count).toEqual(0);
    expect(reducerA).toHaveBeenCalled();
    expect(sagaExe).not.toHaveBeenCalled();
    expect(store.getState()).toEqual({ count: 0 });
  });
  test('it updates store once running', async () => {
    const sagaMiddleware = createSagaMiddleware(sagaExe);
    const store = createStore(reducerA, applyMiddleware(sagaMiddleware));
    sagaMiddleware.run();

    expect(store.getState()).toEqual({ count: 0 });
    expect(sagaExe).toHaveBeenCalled();

    store.dispatch({ type: DELAYED_INCREMENT_COUNTER });
    expect(store.getState()).toEqual({ count: 0 });

    await sleep(5);

    expect(store.getState()).toEqual({ count: 1 });
  });
});
