/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ACTION_STATES = {

  // Action is not being executed because conditions haven't been met
  OK: 'OK',

  // Action has been acknowledged by user
  ACKNOWLEDGED: 'Acked',

  // Action has been throttled (time-based) by the system
  THROTTLED: 'Throttled',

  // Action has been completed
  FIRING: 'Firing',

  // Action has failed
  ERROR: 'Error'

};
