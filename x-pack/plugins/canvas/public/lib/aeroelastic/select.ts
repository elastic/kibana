/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunc, NodeResult, State } from './types';

export const select = (selectFun: NodeFunc): NodeFunc => (...fns: NodeFunc[]): NodeResult => {
  let { prevId, memo } = { prevId: NaN as ActionId, memo: null as NodeResult };
  const old = (object: State) => prevId === (prevId = object.primaryUpdate.payload.uid);
  return (obj: State) => (old(obj) ? memo : (memo = selectFun(...fns.map(fun => fun(obj)))));
};
