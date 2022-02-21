/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_SAVED_OBJECT_TYPE = 'alert';

export const RULE_EXECUTION_LOG_PROVIDER = 'securitySolution.ruleExecution';

export enum RuleExecutionLogAction {
  'status-change' = 'status-change',
  'execution-metrics' = 'execution-metrics',
}
