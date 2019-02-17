/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {ActionId, Json, PlainFun, Selector, State} from '.';

// any arbitrary pure logic function, eg. in layout_functions.js

export const select = (fun: PlainFun): Selector => (...fns) => {
  let { prevId, cache } = { prevId: NaN as ActionId, cache: null as Json };
  const old = (object: State): boolean => prevId === (prevId = object.primaryUpdate.payload.uid);
  return obj => (old(obj) ? cache : (cache = fun(...fns.map(f => f(obj) as Json))));
};
