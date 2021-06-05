/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CtiEventEnrichmentRequestOptions, CtiQueries } from '.';

export const buildRequestOptionsMock = (
  overrides: Partial<CtiEventEnrichmentRequestOptions> = {}
): CtiEventEnrichmentRequestOptions => ({
  defaultIndex: ['filebeat-*'],
  eventFields: {
    'file.hash.md5': '1eee2bf3f56d8abed72da2bc523e7431',
    'source.ip': '127.0.0.1',
    'url.full': 'elastic.co',
  },
  factoryQueryType: CtiQueries.eventEnrichment,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  timerange: { interval: '', from: '2020-09-13T09:00:43.249Z', to: '2020-09-14T09:00:43.249Z' },
  ...overrides,
});
