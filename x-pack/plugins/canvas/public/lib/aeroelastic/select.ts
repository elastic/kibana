/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunction, NodeResult } from './types';

const selectDebug = (fun: NodeFunction): NodeFunction => (
  ...inputs: NodeFunction[]
): NodeResult => (state: NodeResult) => fun(...inputs.map(input => input(state)));

const selectFast = (fun: NodeFunction): NodeFunction => (...inputs: NodeFunction[]): NodeResult => {
  // last-value memoizing version of this single line function:
  // fun => (...inputs) => state => fun(...inputs.map(input => input(state)))
  let value: NodeResult;
  let actionId: ActionId;
  return (state: NodeResult) => {
    const lastActionId: ActionId = state.primaryUpdate.payload.uid;
    if (actionId === lastActionId) {
      return value;
    }

    value = fun(...inputs.map(input => input(state)));
    actionId = lastActionId;
    return value;
  };
};

export const select = selectFast;
