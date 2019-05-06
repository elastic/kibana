/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';

export function clear(): Function<'clear', {}, null> {
  return {
    name: 'clear',
    type: 'null',
    help: 'Clears context and returns null',
    args: {},
    fn: () => null,
  };
}
