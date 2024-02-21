/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

const DEFAULT_FROM_MINUTES_VALUE = 15;
export const DEFAULT_TIMERANGE = { from: `now-${DEFAULT_FROM_MINUTES_VALUE}m`, to: 'now' };
export const DEFAULT_FILTERS = [];
