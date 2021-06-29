/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { APMEventESSearchRequest } from '.';
import { ApmIndicesConfig } from '../../../settings/apm_indices/get_apm_indices';
import { unpackProcessorEvents } from './unpack_processor_events';

describe('unpackProcessorEvents', () => {
  let res: ReturnType<typeof unpackProcessorEvents>;
  beforeEach(() => {
    const request = {
      apm: { events: ['transaction', 'error'] },
      body: { query: { bool: { filter: [{ terms: { foo: 'bar' } }] } } },
    } as APMEventESSearchRequest;

    const indices = {
      'apm_oss.transactionIndices': 'my-apm-*-transaction-*',
      'apm_oss.metricsIndices': 'my-apm-*-metric-*',
      'apm_oss.errorIndices': 'my-apm-*-error-*',
      'apm_oss.spanIndices': 'my-apm-*-span-*',
      'apm_oss.onboardingIndices': 'my-apm-*-onboarding-',
      'apm_oss.sourcemapIndices': 'my-apm-*-sourcemap-*',
    } as ApmIndicesConfig;

    res = unpackProcessorEvents(request, indices);
  });

  it('adds terms filter for apm events', () => {
    expect(res.body.query.bool.filter).toContainEqual({
      terms: { 'processor.event': ['transaction', 'error'] },
    });
  });

  it('merges queries', () => {
    expect(res.body.query.bool.filter).toEqual([
      { terms: { foo: 'bar' } },
      { terms: { 'processor.event': ['transaction', 'error'] } },
    ]);
  });

  it('searches the specified indices', () => {
    expect(res.index).toEqual(['my-apm-*-transaction-*', 'my-apm-*-error-*']);
  });
});
