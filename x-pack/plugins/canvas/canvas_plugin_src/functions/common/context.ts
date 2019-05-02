/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Function } from '../types';

export function context(): Function<'context', {}, any> {
  return {
    name: 'context',
    help:
      'Returns whatever you pass into it. This can be useful when you need to use context as argument to a function as a sub-expression',
    args: {},
    fn: obj => obj,
  };
}
