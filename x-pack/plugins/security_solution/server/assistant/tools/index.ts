/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRODUCT_DOCUMENTATION_TOOL } from './product_docs/product_documentation_tool';
import { NL_TO_ESQL_TOOL } from './esql/nl_to_esql_tool';
import { ALERT_COUNTS_TOOL } from './alert_counts/alert_counts_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from './open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { DEFEND_INSIGHTS_TOOL } from './defend_insights';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from './knowledge_base/knowledge_base_retrieval_tool';
import { KNOWLEDGE_BASE_WRITE_TOOL } from './knowledge_base/knowledge_base_write_tool';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs/security_labs_tool';

export const assistantTools = [
  ALERT_COUNTS_TOOL,
  DEFEND_INSIGHTS_TOOL,
  KNOWLEDGE_BASE_RETRIEVAL_TOOL,
  KNOWLEDGE_BASE_WRITE_TOOL,
  NL_TO_ESQL_TOOL,
  OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL,
  PRODUCT_DOCUMENTATION_TOOL,
  SECURITY_LABS_KNOWLEDGE_BASE_TOOL,
];
