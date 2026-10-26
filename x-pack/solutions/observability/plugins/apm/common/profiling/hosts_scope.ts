/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingHostsCorrelation, ProfilingHostsScope } from '@kbn/apm-api-shared';
import { ProfilingESField } from '@kbn/profiling-utils';
import { CONTAINER_ID, HOST_NAME } from '../es_fields/apm';
import { mergeKueries, toKueryFilterFormat } from '../utils/kuery_utils';

export interface ProfilingScopeCandidate {
  scope: ProfilingHostsScope;
  kuery: string;
}

/**
 * Builds the kuery that selects the service's profiling samples for one correlation scope.
 */
export function getProfilingScopeKuery({
  scope,
  hostNames,
  containerIds,
  workloadNames,
}: ProfilingHostsCorrelation): string {
  switch (scope) {
    case 'container':
      return `(${toKueryFilterFormat(CONTAINER_ID, containerIds)})`;
    case 'workload':
      return mergeKueries([
        `(${toKueryFilterFormat(HOST_NAME, hostNames)})`,
        `(${toKueryFilterFormat(ProfilingESField.OrchestratorResourceName, workloadNames)})`,
      ]);
    case 'workloadAnyHost':
      return `(${toKueryFilterFormat(ProfilingESField.OrchestratorResourceName, workloadNames)})`;
    case 'host':
      return `(${toKueryFilterFormat(HOST_NAME, hostNames)})`;
  }
}

/**
 * Lists the correlation scopes worth trying for a service, most specific first. A scope is only a
 * candidate when every key it filters on is known.
 *
 * Known limitation — `workloadAnyHost` and `workload`:
 * `orchestrator.resource.name` is not globally unique across Kubernetes namespaces or clusters.
 * When multiple namespaces or clusters ship profiling data to the same deployment, this tier can
 * mix samples from unrelated workloads that share a name. Until namespace/cluster keys are
 * available on both APM telemetry and profiling events, prefer using `container` or `host` tiers
 * where possible and treat the workload tiers as a best-effort fallback.
 */
export function getProfilingScopeCandidates(
  correlation: Omit<ProfilingHostsCorrelation, 'scope'>
): ProfilingScopeCandidate[] {
  const { hostNames, containerIds, workloadNames } = correlation;
  const scopes: ProfilingHostsScope[] = [];

  if (containerIds.length > 0) {
    scopes.push('container');
  }
  if (hostNames.length > 0 && workloadNames.length > 0) {
    scopes.push('workload');
  }
  if (workloadNames.length > 0) {
    // The profiler reports the kernel hostname while APM data usually carries the Kubernetes node
    // name; when they differ the workload can still be matched without the host constraint.
    scopes.push('workloadAnyHost');
  }
  if (hostNames.length > 0) {
    scopes.push('host');
  }

  return scopes.map((scope) => ({
    scope,
    kuery: getProfilingScopeKuery({ ...correlation, scope }),
  }));
}
