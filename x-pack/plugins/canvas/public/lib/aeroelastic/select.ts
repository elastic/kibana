/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunction, NodeResult } from './types';

const shallowArrayEqual = (a: any, b: any): boolean =>
  a.length === b.length && a.every((v: any, i: number) => v === b[i]);

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
      shallowArrayEqual(argumentValues, (argumentValues = inputs.map(input => input(state))))
    ) {
      return value;
    }

    value = fun(...argumentValues);
    actionId = lastActionId;
    return value;
  };
};
