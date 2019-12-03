/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverState, ResolverAction } from '../types';
export function reducer(state: ResolverState = true, action: ResolverAction) {
  if (action.type === 'shut') {
    return state;
  } else {
    return !state;
  }
}
