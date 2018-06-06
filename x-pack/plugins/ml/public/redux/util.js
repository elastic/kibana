/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function createEnum(actionNames) {
  return actionNames.reduce((d, actionName) => {
    d[actionName] = actionName;
    return d;
  }, {});
}

export function createActionCreators(actionNames) {
  return actionNames.reduce((d, type) => {
    const funcName = _.camelCase(type.toLowerCase().replace('_', '-'));
    d[funcName] = (payload) => ({ type, payload });
    return d;
  }, {});
}

export function createActions(actionNames) {
  return {
    actionTypes: createEnum(actionNames),
    actions: createActionCreators(actionNames)
  };
}

export const reduxBootstrap = ({ defaultState, actionDefs }) => {
  const { actionTypes, actions } = createActions(Object.keys(actionDefs));

  const reducer = (state = defaultState, action) => {
    if (
      actionDefs[action.type] !== undefined &&
      typeof state === 'object' &&
      state !== null
    ) {
      if (action.payload === null) {
        return state;
      }
      return { ...state, ...actionDefs[action.type](action.payload) };
    } else if (
      actionDefs[action.type] !== undefined &&
      (typeof state !== 'object' || state === null)
    ) {
      return action.payload;
    } else {
      return state;
    }
  };

  return {
    actionTypes,
    actions,
    reducer
  };
};
