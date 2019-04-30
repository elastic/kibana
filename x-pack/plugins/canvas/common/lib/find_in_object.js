/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { each } from 'lodash';

export function findInObject(o, fn, memo, name) {
  memo = memo || [];
  if (fn(o, name)) {
    memo.push(o);
  }
  if (o != null && typeof o === 'object') {
    each(o, (val, name) => findInObject(val, fn, memo, name));
  }

  return memo;
}
