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
export const WATCH_STATES: { [key: string]: string } = {
  DISABLED: 'Disabled',
  OK: 'OK',
  FIRING: 'Firing',
  ERROR: 'Error',
  CONFIG_ERROR: 'Config error',
};
