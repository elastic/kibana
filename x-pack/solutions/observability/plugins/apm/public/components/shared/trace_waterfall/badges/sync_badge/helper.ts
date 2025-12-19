/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticAgentName } from '@kbn/elastic-agent-utils/src/agent_names';
import {
  OPEN_TELEMETRY_AGENT_NAMES,
  EDOT_AGENT_NAMES,
} from '@kbn/elastic-agent-utils/src/agent_names';

type OtelLanguage = 'webjs' | 'swift' | 'android' | 'cpp' | 'erlang' | 'rust';
type SyncBadgeAgentName = ElasticAgentName | OtelLanguage;

/**
 * Set of known OTEL and EDOT agents for O(1) lookup validation.
 */
const knownOtelAgents: Set<string> = new Set([...OPEN_TELEMETRY_AGENT_NAMES, ...EDOT_AGENT_NAMES]);

/**
 * Maps agent names and language names to their expected sync behavior.
 * Includes Elastic agent names and OTEL language names.
 *
 * true: Language natively operates synchronously (e.g., Node.js, browser JS)
 * false: Language natively operates asynchronously (e.g., Python, PHP, Go)
 */
export const agentsSyncMap = new Map<SyncBadgeAgentName, boolean>([
  ['nodejs', true],
  ['js-base', true],
  ['rum-js', true],
  ['php', false],
  ['python', false],
  ['dotnet', false],
  ['iOS/swift', false],
  ['ruby', false],
  ['java', false],
  ['go', false],
  ['android/java', false],
  // OTEL-specific language names
  ['webjs', true],
  ['cpp', false],
  ['erlang', false],
  ['rust', false],
  ['swift', false],
  ['android', false],
]);

/**
 * Gets the sync behavior value for any agent (Elastic, OTEL, or EDOT).
 * Returns undefined if the agent is not recognized.
 *
 * @param agentName - The agent name (e.g., 'nodejs', 'opentelemetry/java', 'otlp/python/elastic')
 * @returns true for sync agents, false for async agents, undefined if unknown
 */
export function getAgentSyncValue(agentName: string): boolean | undefined {
  const agentNameKey = agentName as SyncBadgeAgentName;
  if (agentsSyncMap.has(agentNameKey)) {
    return agentsSyncMap.get(agentNameKey);
  }

  if (knownOtelAgents.has(agentName)) {
    const lang = agentName.split('/')[1];
    if (lang) {
      return agentsSyncMap.get(lang as SyncBadgeAgentName);
    }
  }

  return undefined;
}
