/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool } from '@kbn/elastic-assistant-plugin/server';

import { ALERT_COUNTS_TOOL } from './alert_counts/alert_counts_tool';
import { ESQL_KNOWLEDGE_BASE_TOOL } from './esql_language_knowledge_base/esql_language_knowledge_base_tool';
import { ESQL_KNOWLEDGE_BASE_STRUCTURED_TOOL } from './esql_language_knowledge_base/esql_language_knowledge_base_structured_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from './open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { ATTACK_DISCOVERY_TOOL } from './attack_discovery/attack_discovery_tool';

export const getAssistantTools = (): AssistantTool[] => [
  ALERT_COUNTS_TOOL,
  ATTACK_DISCOVERY_TOOL,
  ESQL_KNOWLEDGE_BASE_TOOL,
  ESQL_KNOWLEDGE_BASE_STRUCTURED_TOOL,
  OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL,
];
