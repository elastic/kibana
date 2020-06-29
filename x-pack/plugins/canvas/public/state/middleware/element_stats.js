/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setElementStats } from '../actions/transient';
import { getAllElements, getElementCounts, getElementStats } from '../selectors/workpad';

export const elementStats = ({ dispatch, getState }) => (next) => (action) => {
  // execute the action
  next(action);

  // read the new state
  const state = getState();

  const stats = getElementStats(state);
  const total = getAllElements(state).length;
  const counts = getElementCounts(state);
  const { ready, error } = counts;

  // TODO: this should come from getElementStats, once we've gotten element status fixed
  const pending = total - ready - error;

  if (
    total > 0 &&
    (ready !== stats.ready ||
      pending !== stats.pending ||
      error !== stats.error ||
      total !== stats.total)
  ) {
    dispatch(setElementStats({ total, ready, pending, error }));
  }
};
