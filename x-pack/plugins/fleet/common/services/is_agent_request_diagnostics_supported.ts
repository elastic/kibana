/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';

import type { Agent } from '../types';

export const MINIMUM_DIAGNOSTICS_AGENT_VERSION = '8.7.0';

export function isAgentRequestDiagnosticsSupported(agent: Agent) {
  if (!agent.active) {
    return false;
  }
  if (typeof agent?.local_metadata?.elastic?.agent?.version !== 'string') {
    return false;
  }
  const agentVersion = agent.local_metadata.elastic.agent.version;
  return semverGte(agentVersion, MINIMUM_DIAGNOSTICS_AGENT_VERSION);
}
