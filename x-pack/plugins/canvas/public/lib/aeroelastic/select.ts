/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionId, NodeFunction, NodeResult } from './types';

export const select = (fun: NodeFunction): NodeFunction => (...fns) => {
  let prevId: ActionId = NaN;
  let cache: NodeResult = null;
  const old = (object: NodeResult): boolean =>
    prevId === (prevId = object.primaryUpdate.payload.uid);
  return (obj: NodeResult) =>
    old(obj) ? cache : (cache = fun(...fns.map(f => f(obj) as NodeResult)));
};
