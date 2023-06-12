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

export const DEFAULT_FILTERS = [];

export const DEFAULT_TIMERANGE = {
  from: 'now-1d',
  to: 'now',
};

export const DEFAULT_REFRESH_TIME_RANGE = DEFAULT_TIMERANGE;
