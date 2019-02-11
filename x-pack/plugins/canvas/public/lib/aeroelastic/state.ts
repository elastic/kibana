/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowEqual } from './functional';
import {
  ActionId,
  ChangeCallbackFunction,
  Meta,
  NodeFunction,
  NodeResult,
  Payload,
  TypeName,
  UpdaterFunction,
} from './types';

const makeUid = (): ActionId => 1e11 + Math.floor((1e12 - 1e11) * Math.random());

export const selectReduce = (fun: NodeFunction, previousValue: NodeResult): NodeFunction => (
  ...inputs: NodeFunction[]
): NodeResult => {
  // last-value memoizing version of this single line function:
  // (fun, previousValue) => (...inputs) => state => previousValue = fun(previousValue, ...inputs.map(input => input(state)))
  let argumentValues = [] as NodeResult[];
  let value = previousValue;
  let prevValue = previousValue;
  return (state: NodeResult) => {
    if (
      shallowEqual(argumentValues, (argumentValues = inputs.map(input => input(state)))) &&
      value === prevValue
    ) {
      return value;
    }

    prevValue = value;
    value = fun(prevValue, ...argumentValues);
    return value;
  };
};

export const select = (fun: NodeFunction): NodeFunction => (
  ...inputs: NodeFunction[]
): NodeResult => {
  // last-value memoizing version of this single line function:
  // fun => (...inputs) => state => fun(...inputs.map(input => input(state)))
  let argumentValues = [] as NodeResult[];
  let value: NodeResult;
  let actionId: ActionId;
  return (state: NodeResult) => {
    const lastActionId: ActionId = state.primaryUpdate.payload.uid;
    if (
      actionId === lastActionId ||
      shallowEqual(argumentValues, (argumentValues = inputs.map(input => input(state))))
    ) {
      return value;
    }

    value = fun(...argumentValues);
    actionId = lastActionId;
    return value;
  };
};

export const createStore = (initialState: NodeResult, onChangeCallback: ChangeCallbackFunction) => {
  let currentState = initialState;
  let updater: UpdaterFunction = (state: NodeResult): NodeResult => state; // default: no side effect
  const getCurrentState = () => currentState;
  // const setCurrentState = newState => (currentState = newState);
  const setUpdater = (updaterFunction: UpdaterFunction) => {
    updater = updaterFunction;
  };

  const commit = (type: TypeName, payload: Payload, meta: Meta = { silent: false }) => {
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

  const dispatch = (type: TypeName, payload: Payload) => setTimeout(() => commit(type, payload));

  return { getCurrentState, setUpdater, commit, dispatch };
};
