/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../../apm/typings/es_schemas/ui/fields/agent';

export const RUM_AGENT_NAMES: AgentName[] = [
  'js-base',
  'rum-js',
  'opentelemetry/webjs',
];

export function isRumAgentName(
  agentName?: string
): agentName is 'js-base' | 'rum-js' | 'opentelemetry/webjs' {
  return RUM_AGENT_NAMES.includes(agentName! as AgentName);
}
