/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './filters';
export * from './merge_fields_with_hits';
export * from './calculate_timeseries_interval';
export * from './reduce_fields';

export const inspectStringifyObject = (obj: unknown) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return 'Sorry about that, something went wrong.';
  }
};
