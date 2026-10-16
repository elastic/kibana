/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProfilingScopeCandidates, getProfilingScopeKuery } from './hosts_scope';

describe('getProfilingScopeCandidates', () => {
  it('tries container, workload on host, workload anywhere and host, in that order', () => {
    const candidates = getProfilingScopeCandidates({
      hostNames: ['node-a'],
      containerIds: ['abc'],
      workloadNames: ['cart'],
    });

    expect(candidates.map(({ scope }) => scope)).toEqual([
      'container',
      'workload',
      'workloadAnyHost',
      'host',
    ]);
  });

  it('skips scopes whose keys are unknown', () => {
    expect(
      getProfilingScopeCandidates({
        hostNames: ['node-a'],
        containerIds: [],
        workloadNames: [],
      }).map(({ scope }) => scope)
    ).toEqual(['host']);

    expect(
      getProfilingScopeCandidates({ hostNames: [], containerIds: [], workloadNames: ['cart'] }).map(
        ({ scope }) => scope
      )
    ).toEqual(['workloadAnyHost']);

    expect(
      getProfilingScopeCandidates({ hostNames: [], containerIds: [], workloadNames: [] })
    ).toEqual([]);
  });
});

describe('getProfilingScopeKuery', () => {
  const correlation = {
    hostNames: ['node-a', 'node-b'],
    containerIds: ['abc'],
    workloadNames: ['cart'],
  };

  it('filters by container ids', () => {
    expect(getProfilingScopeKuery({ ...correlation, scope: 'container' })).toBe(
      '(container.id : "abc")'
    );
  });

  it('filters by host names and workload names', () => {
    expect(getProfilingScopeKuery({ ...correlation, scope: 'workload' })).toBe(
      '(host.name : "node-a" OR host.name : "node-b") AND (orchestrator.resource.name : "cart")'
    );
  });

  it('filters by workload names only', () => {
    expect(getProfilingScopeKuery({ ...correlation, scope: 'workloadAnyHost' })).toBe(
      '(orchestrator.resource.name : "cart")'
    );
  });

  it('filters by host names', () => {
    expect(getProfilingScopeKuery({ ...correlation, scope: 'host' })).toBe(
      '(host.name : "node-a" OR host.name : "node-b")'
    );
  });
});
