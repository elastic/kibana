/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunc, NodeResult, State } from './types';

export const select = (selectFun: NodeFunc): NodeFunc => (...fns: NodeFunc[]): NodeResult => {
  let { prevId, value } = { prevId: NaN as ActionId, value: null as NodeResult };
  return (object: State) => {
    const currentId: ActionId = object.primaryUpdate.payload.uid;
    value = prevId === currentId ? value : selectFun(...fns.map(fun => fun(object)));
    prevId = currentId;
    return value;
  };
};
