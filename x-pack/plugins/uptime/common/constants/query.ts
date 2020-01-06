/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * These are the fields that will be used when users enter simple_query_string
 * searches into the FilterBar component.
 */
export const QUERY = {
  DEFAULT_BUCKET_COUNT: 25,
  // the maximum buckets allowed by most aggregations
  DEFAULT_AGGS_CAP: 10000,
  SIMPLE_QUERY_STRING_FIELDS: [
    'monitor.id',
    'monitor.url',
    'monitor.type',
    'monitor.status',
    'monitor.name',
    'url.full',
    'url.path',
    'url.scheme',
    'url.domain',
    'error.type',
  ],
};

export const STATES = {
  // Number of results returned for a states query
  LEGACY_STATES_QUERY_SIZE: 10,
  // The maximum number of monitors that should be supported
  MAX_MONITORS: 35000,
};
