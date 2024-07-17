/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';

import type { Agent } from '../../types';

export function isAgentInNamespace(agent: Agent, namespace?: string) {
  return (
    (namespace && agent.namespaces?.includes(namespace)) ||
    (!namespace &&
      (!agent.namespaces ||
        agent.namespaces.length === 0 ||
        agent.namespaces?.includes(DEFAULT_NAMESPACE_STRING)))
  );
}
