/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getDate = state => state.date;
export const getDateForUrlComparison = state => {
  const { isSet, ...date } = getDate(state); // eslint-disable-line no-unused-vars
  return date;
};
export const getDateIsSet = state => getDate(state).isSet;
export const getRefreshInterval = state => getDate(state).refreshInterval.value;
export const getIsPaused = state => getDate(state).refreshInterval.pause;
export const getStartTime = state => getDate(state).time.from;
export const getEndTime = state => getDate(state).time.to;
