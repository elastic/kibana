/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';

import { appContextService } from '../app_context';

import type { Agent } from '../../types';

export function isAgentInNamespace(agent: Agent, namespace?: string) {
  const useSpaceAwareness = appContextService.getExperimentalFeatures()?.useSpaceAwareness;
  if (!useSpaceAwareness) {
    return true;
  }

  return (
    (namespace && agent.namespaces?.includes(namespace)) ||
    (!namespace &&
      (!agent.namespaces ||
        agent.namespaces.length === 0 ||
        agent.namespaces?.includes(DEFAULT_NAMESPACE_STRING)))
  );
}

export function agentsKueryNamespaceFilter(namespace?: string) {
  const useSpaceAwareness = appContextService.getExperimentalFeatures()?.useSpaceAwareness;
  if (!useSpaceAwareness || !namespace) {
    return;
  }
  return namespace === DEFAULT_NAMESPACE_STRING
    ? `namespaces:(${DEFAULT_NAMESPACE_STRING}) or not namespaces:*`
    : `namespaces:(${namespace})`;
}
