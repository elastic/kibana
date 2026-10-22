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

  it('includes workloadAnyHost without workload when hostNames differ from profiling host.name (customer scenario)', () => {
    // This is the exact scenario from elastic/sdh-apm#2111: the profiling agent records
    // host.name = kernel hostname ("ssvc-elk-2") while APM carries the Kubernetes node name
    // ("ip-172-28-75-27.eu-west-1.compute.internal"). The workloadAnyHost tier matches by
    // orchestrator.resource.name alone and is the one that returns samples.
    const candidates = getProfilingScopeCandidates({
      hostNames: ['ip-172-28-75-27.eu-west-1.compute.internal'],
      containerIds: [],
      workloadNames: ['cart-php'],
    });
    expect(candidates.map(({ scope }) => scope)).toEqual(['workload', 'workloadAnyHost', 'host']);
  });

  it('excludes workload scope when hostNames is empty even if workloadNames is present', () => {
    // Without a host name there is nothing to constrain the workload to the right node; the
    // workloadAnyHost tier is the only match.
    const candidates = getProfilingScopeCandidates({
      hostNames: [],
      containerIds: ['abc'],
      workloadNames: ['frontend'],
    });
    expect(candidates.map(({ scope }) => scope)).toEqual(['container', 'workloadAnyHost']);
  });

  it('generates the kuery for all scopes when all keys are present', () => {
    const candidates = getProfilingScopeCandidates({
      hostNames: ['node-a'],
      containerIds: ['abc'],
      workloadNames: ['cart'],
    });
    const kueries = Object.fromEntries(candidates.map(({ scope, kuery }) => [scope, kuery]));
    expect(kueries.container).toBe('(container.id : "abc")');
    expect(kueries.workload).toBe(
      '(host.name : "node-a") AND (orchestrator.resource.name : "cart")'
    );
    expect(kueries.workloadAnyHost).toBe('(orchestrator.resource.name : "cart")');
    expect(kueries.host).toBe('(host.name : "node-a")');
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

  it('ORs multiple container ids', () => {
    expect(
      getProfilingScopeKuery({
        hostNames: ['node-a'],
        containerIds: ['abc', 'def'],
        workloadNames: ['cart'],
        scope: 'container',
      })
    ).toBe('(container.id : "abc" OR container.id : "def")');
  });

  it('uses service name as the workload name when no deployment name is known', () => {
    // getServiceCorrelationFields falls back to [serviceName] when deploymentNames is empty;
    // the kuery must still filter on orchestrator.resource.name with that value.
    expect(
      getProfilingScopeKuery({
        hostNames: ['node-a'],
        containerIds: [],
        workloadNames: ['my-service'],
        scope: 'workloadAnyHost',
      })
    ).toBe('(orchestrator.resource.name : "my-service")');
  });

  it('ORs multiple workload names in the workload scope', () => {
    expect(
      getProfilingScopeKuery({
        hostNames: ['node-a'],
        containerIds: [],
        workloadNames: ['cart', 'cart-v2'],
        scope: 'workloadAnyHost',
      })
    ).toBe('(orchestrator.resource.name : "cart" OR orchestrator.resource.name : "cart-v2")');
  });
});
