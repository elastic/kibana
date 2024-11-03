/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';

import type { Agent } from '../../types';

import { isSpaceAwarenessEnabled } from './helpers';

export async function isAgentInNamespace(agent: Agent, namespace?: string) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness) {
    return true;
  }

  // In a custom space, only return true if the agent is explicitly in that space.
  if (namespace && namespace !== DEFAULT_NAMESPACE_STRING) {
    return agent.namespaces?.includes(namespace) ?? false;
  }

  // In the default space OR in if the current namespace is not defined,
  // return true if the agent is explicitly in the default space OR if it has no defined namespaces.
  return (
    !agent.namespaces ||
    agent.namespaces.length === 0 ||
    agent.namespaces?.includes(DEFAULT_NAMESPACE_STRING)
  );
}

export async function agentsKueryNamespaceFilter(namespace?: string) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness || !namespace) {
    return;
  }
  return namespace === DEFAULT_NAMESPACE_STRING
    ? `namespaces:(${DEFAULT_NAMESPACE_STRING}) or not namespaces:*`
    : `namespaces:(${namespace})`;
}
