/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverState, FullyEvaluatedSelectors, Selectors } from '../types';
import * as selectors from './selectors';

/**
 * Evaluate all the selectors. Some selectors return a function of time, so evaluate those with a timestamp.
 */
export const presenter: (
  state: ResolverState,
  time: number,
  onlyThese?: Set<keyof FullyEvaluatedSelectors>
) => FullyEvaluatedSelectors = (state, time, onlyThese) => {
  const result: Partial<Record<
    keyof FullyEvaluatedSelectors,
    FullyEvaluatedSelectors[keyof FullyEvaluatedSelectors]
  >> = {};
  for (const key of Object.keys(selectors) as Array<keyof Selectors>) {
    if (onlyThese && onlyThese.has(key) === false) {
      continue;
    }
    const selector = selectors[key];
    const value = selector(state);
    if (typeof value === 'function') {
      result[key] = value(time);
    } else {
      result[key] = value;
    }
  }
  return result as FullyEvaluatedSelectors;
};
