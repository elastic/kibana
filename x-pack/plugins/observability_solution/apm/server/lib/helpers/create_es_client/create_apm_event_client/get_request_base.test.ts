/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventESSearchRequest } from '.';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { getRequestBase } from './get_request_base';

describe('getRequestBase', () => {
  let res: ReturnType<typeof getRequestBase>;
  beforeEach(() => {
    const request = {
      apm: { events: ['transaction', 'error'] },
      body: {
        track_total_hits: false,
        size: 0,
      },
    } as APMEventESSearchRequest;

    const indices = {
      transaction: 'my-apm-*-transaction-*',
      metric: 'my-apm-*-metric-*',
      error: 'my-apm-*-error-*',
      span: 'my-apm-*-span-*',
      onboarding: 'my-apm-*-onboarding-*',
    } as APMIndices;

    res = getRequestBase({ ...request, indices });
  });

  it('adds terms filter for apm events', () => {
    expect(res.filters).toContainEqual({
      terms: { 'processor.event': ['transaction', 'error'] },
    });
  });

  it('searches the specified indices', () => {
    expect(res.index).toEqual(['my-apm-*-transaction-*', 'my-apm-*-error-*']);
  });
});
