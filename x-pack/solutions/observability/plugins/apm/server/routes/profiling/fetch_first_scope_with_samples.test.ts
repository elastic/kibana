/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingScopeCandidate } from '../../../common/profiling/hosts_scope';
import { fetchFirstScopeWithSamples } from './fetch_first_scope_with_samples';

const makeCandidate = (
  scope: ProfilingScopeCandidate['scope'],
  kuery: string
): ProfilingScopeCandidate => ({
  scope,
  kuery,
});

describe('fetchFirstScopeWithSamples', () => {
  it('returns undefined when no candidates are provided', async () => {
    const fetch = jest.fn().mockResolvedValue({ samples: 10 });

    const result = await fetchFirstScopeWithSamples({
      candidates: [],
      kuery: '',
      fetch,
      hasSamples: () => true,
    });

    expect(result).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the first candidate whose result has samples', async () => {
    const container = makeCandidate('container', '(container.id : "abc")');
    const host = makeCandidate('host', '(host.name : "node-a")');

    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ count: 0 }) // container — no samples
      .mockResolvedValueOnce({ count: 5 }); // host — has samples

    const result = await fetchFirstScopeWithSamples({
      candidates: [container, host],
      kuery: '',
      fetch,
      hasSamples: (r: { count: number }) => r.count > 0,
    });

    expect(result).toMatchObject({ candidate: host, result: { count: 5 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stops at the first candidate with samples without trying subsequent scopes', async () => {
    const container = makeCandidate('container', '(container.id : "abc")');
    const workload = makeCandidate(
      'workload',
      '(host.name : "node-a") AND (orchestrator.resource.name : "cart")'
    );
    const host = makeCandidate('host', '(host.name : "node-a")');

    const fetch = jest.fn().mockResolvedValueOnce({ count: 42 }); // container — has samples, stop here

    const result = await fetchFirstScopeWithSamples({
      candidates: [container, workload, host],
      kuery: '',
      fetch,
      hasSamples: (r: { count: number }) => r.count > 0,
    });

    expect(result?.candidate.scope).toBe('container');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns the last candidate when all scopes are empty', async () => {
    const container = makeCandidate('container', '(container.id : "abc")');
    const workloadAnyHost = makeCandidate(
      'workloadAnyHost',
      '(orchestrator.resource.name : "cart")'
    );

    const fetch = jest.fn().mockResolvedValue({ count: 0 });

    const result = await fetchFirstScopeWithSamples({
      candidates: [container, workloadAnyHost],
      kuery: '',
      fetch,
      hasSamples: (r: { count: number }) => r.count > 0,
    });

    expect(result?.candidate.scope).toBe('workloadAnyHost');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('merges the scope kuery with the user kuery before fetching', async () => {
    const container = makeCandidate('container', '(container.id : "abc")');
    const fetch = jest.fn().mockResolvedValue({ count: 1 });

    await fetchFirstScopeWithSamples({
      candidates: [container],
      kuery: 'service.name : "my-service"',
      fetch,
      hasSamples: () => true,
    });

    expect(fetch).toHaveBeenCalledWith('(container.id : "abc") AND service.name : "my-service"');
  });

  it('passes the scope kuery as-is when the user kuery is empty', async () => {
    const host = makeCandidate('host', '(host.name : "node-a")');
    const fetch = jest.fn().mockResolvedValue({ count: 1 });

    await fetchFirstScopeWithSamples({
      candidates: [host],
      kuery: '',
      fetch,
      hasSamples: () => true,
    });

    expect(fetch).toHaveBeenCalledWith('(host.name : "node-a")');
  });
});
