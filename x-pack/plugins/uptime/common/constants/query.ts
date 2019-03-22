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
  SIMPLE_QUERY_STRING_FIELDS: [
    'error.type',
    'monitor.id',
    'monitor.name',
    'monitor.status',
    'monitor.type',
    'monitor.url',
    'url.domain',
    'url.full',
    'url.path',
    'url.scheme',
  ],
};
