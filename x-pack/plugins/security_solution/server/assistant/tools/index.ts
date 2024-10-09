/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool } from '@kbn/elastic-assistant-plugin/server';

import { ESQL_KNOWLEDGE_BASE_TOOL } from './esql_language_knowledge_base/esql_language_knowledge_base_tool';
import { NL_TO_ESQL_TOOL } from './esql_language_knowledge_base/nl_to_esql_tool';
import { ALERT_COUNTS_TOOL } from './alert_counts/alert_counts_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from './open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { ATTACK_DISCOVERY_TOOL } from './attack_discovery/attack_discovery_tool';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from './knowledge_base/knowledge_base_retrieval_tool';
import { KNOWLEDGE_BASE_WRITE_TOOL } from './knowledge_base/knowledge_base_write_tool';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs/security_labs_tool';

export const getAssistantTools = ({
  naturalLanguageESQLToolEnabled,
  assistantKnowledgeBaseByDefault,
}: {
  naturalLanguageESQLToolEnabled?: boolean;
  assistantKnowledgeBaseByDefault?: boolean;
}): AssistantTool[] => {
  const tools = [
    ALERT_COUNTS_TOOL,
    ATTACK_DISCOVERY_TOOL,
    naturalLanguageESQLToolEnabled ? NL_TO_ESQL_TOOL : ESQL_KNOWLEDGE_BASE_TOOL,
    KNOWLEDGE_BASE_RETRIEVAL_TOOL,
    KNOWLEDGE_BASE_WRITE_TOOL,
    OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL,
  ];

  if (assistantKnowledgeBaseByDefault) {
    tools.push(SECURITY_LABS_KNOWLEDGE_BASE_TOOL);
  }

  return tools;
};
