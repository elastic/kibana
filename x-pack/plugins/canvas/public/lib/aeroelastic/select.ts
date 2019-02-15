/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunc, NodeResult } from './types';

export const select = (fun: NodeFunc): NodeFunc => (...inputs: NodeFunc[]): NodeResult => {
  let { value, actionId } = { value: null as NodeResult, actionId: NaN as ActionId };
  return (state: NodeResult) => {
    const previousActionId: ActionId = state.primaryUpdate.payload.uid;
    value = actionId === previousActionId ? value : fun.apply(0, inputs.map(input => input(state)));
    actionId = previousActionId;
    return value;
  };
};
