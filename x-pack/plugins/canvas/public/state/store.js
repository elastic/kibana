import { createStore as createReduxStore } from 'redux';
import { isPlainObject } from 'lodash';
import { middleware } from './middleware';
import { getRootReducer } from './reducers';

let store;

export function createStore(initialState) {
  if (typeof store !== 'undefined') {
    throw new Error('Redux store can only be initialized once');
  }

  if (!isPlainObject(initialState)) {
    throw new Error('Initial state must be a plain object');
  }

  const rootReducer = getRootReducer(initialState);
  store = createReduxStore(rootReducer, initialState, middleware);
  return store;
}

export function getState() {
  return store.getState();
}
