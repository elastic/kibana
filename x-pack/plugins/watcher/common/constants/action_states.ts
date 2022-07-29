/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These values are returned by the API and depended upon in both server-side
// and client-side logic. TS will use these values to determine correctness.
// If we were to translate them for the runtime, we would lose the correctness
// guarantee. Therefore, we shouldn't translate them. Translation should occur
// in the UI layer as a separate step, e.g. keying off these values and
// rendering an internationalized string.
export const ACTION_STATES: { [key: string]: string } = {
  // Action is not being executed because conditions haven't been met
  OK: 'OK',

  // Action has been acknowledged by user
  ACKNOWLEDGED: 'Acked',

  // Action has been throttled (time-based) by the system
  THROTTLED: 'Throttled',

  // Action has been completed
  FIRING: 'Firing',

  // Action has failed
  ERROR: 'Error',

  // Action has a configuration error
  CONFIG_ERROR: 'Config error',

  // Action status is unknown; we should never end up in this state
  UNKNOWN: 'Unknown',
};
