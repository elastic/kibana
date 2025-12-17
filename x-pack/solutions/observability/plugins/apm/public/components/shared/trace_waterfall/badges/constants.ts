/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticAgentName } from '@kbn/elastic-agent-utils/src/agent_names';

export type SyncBadgeAgentName = ElasticAgentName;

/**
 * Maps agent names to their expected sync behavior.
 * true: Agent natively operates synchronously (e.g., Node.js, browser JS)
 * false: Agent natively operates asynchronously (e.g., Python, PHP, Go)
 */
export const agentsSyncMap = {
  nodejs: true,
  'js-base': true,
  'rum-js': true,
  php: false,
  python: false,
  dotnet: false,
  'iOS/swift': false,
  ruby: false,
  java: false,
  go: false,
  'android/java': false,
} as const satisfies Record<SyncBadgeAgentName, boolean>;

/**
 * Type guard to check if an agent name is supported by the SyncBadge component.
 */
export function isSyncBadgeAgent(name: string): name is keyof typeof agentsSyncMap {
  return name in agentsSyncMap;
}
