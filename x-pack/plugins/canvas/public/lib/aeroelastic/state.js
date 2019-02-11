/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { shallowEqual } = require('./functional');

/**
 * PoC action dispatch
 */

const makeUid = () => 1e11 + Math.floor((1e12 - 1e11) * Math.random());

const selectReduce = (fun, previousValue, mapFun = d => d, logFun) => (...inputs) => {
  // last-value memoizing version of this single line function:
  // (fun, previousValue) => (...inputs) => state => previousValue = fun(previousValue, ...inputs.map(input => input(state)))
  let argumentValues = [];
  let value = previousValue;
  let prevValue = previousValue;
  let mappedValue;
  return state => {
    if (
      shallowEqual(argumentValues, (argumentValues = inputs.map(input => input(state)))) &&
      value === prevValue
    ) {
      return mappedValue;
    }

    prevValue = value;
    value = fun(prevValue, ...argumentValues);
    if (logFun) {
      logFun(value, argumentValues);
    }
    mappedValue = mapFun(value);
    return mappedValue;
  };
};

const select = (fun, logFun) => (...inputs) => {
  // last-value memoizing version of this single line function:
  // fun => (...inputs) => state => fun(...inputs.map(input => input(state)))
  let argumentValues = [];
  let value;
  let actionId;
  return state => {
    const lastActionId = state.primaryUpdate.payload.uid;
    if (
      actionId === lastActionId ||
      shallowEqual(argumentValues, (argumentValues = inputs.map(input => input(state))))
    ) {
      return value;
    }

    value = fun(...argumentValues);
    actionId = lastActionId;
    if (logFun) {
      logFun(value, argumentValues);
    }
    return value;
  };
};

const createStore = (initialState, onChangeCallback = () => {}) => {
  let currentState = initialState;
  let updater = state => state; // default: no side effect
  const getCurrentState = () => currentState;
  // const setCurrentState = newState => (currentState = newState);
  const setUpdater = updaterFunction => (updater = updaterFunction);

  const commit = (type, payload, meta = {}) => {
    currentState = updater({
      ...currentState,
      primaryUpdate: {
        type,
        payload: { ...payload, uid: makeUid() },
      },
    });
    if (!meta.silent) {
      onChangeCallback({ type, state: currentState }, meta);
    }
  };

  const dispatch = (type, payload) => setTimeout(() => commit(type, payload));

  return { getCurrentState, setUpdater, commit, dispatch };
};

module.exports = {
  createStore,
  select,
  selectReduce,
  makeUid,
};
