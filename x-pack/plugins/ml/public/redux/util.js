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
