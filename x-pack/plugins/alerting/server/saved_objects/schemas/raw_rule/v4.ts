/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-types';
import {
  rawRuleExecutionStatusSchema as rawRuleExecutionStatusSchemaV3,
  rawRuleSchema as rawRuleSchemaV3,
  rawRuleLastRunSchema as rawRuleLastRunSchemaV3,
  executionStatusWarningReason as executionStatusWarningReasonV3,
} from './v3';

export * from './v3';

export const executionStatusErrorReason = schema.oneOf([
  schema.literal(RuleExecutionStatusErrorReasons.Read),
  schema.literal(RuleExecutionStatusErrorReasons.Decrypt),
  schema.literal(RuleExecutionStatusErrorReasons.Execute),
  schema.literal(RuleExecutionStatusErrorReasons.Unknown),
  schema.literal(RuleExecutionStatusErrorReasons.License),
  schema.literal(RuleExecutionStatusErrorReasons.Timeout),
  schema.literal(RuleExecutionStatusErrorReasons.Disabled),
  schema.literal(RuleExecutionStatusErrorReasons.Validate),
  schema.literal(RuleExecutionStatusErrorReasons.Blocked), // new
]);

export const rawRuleLastRunSchema = rawRuleLastRunSchemaV3.extends({
  warning: schema.maybe(
    schema.nullable(schema.oneOf([executionStatusErrorReason, executionStatusWarningReasonV3]))
  ),
});

export const rawRuleExecutionStatusSchema = rawRuleExecutionStatusSchemaV3.extends({
  error: schema.nullable(
    schema.object({
      reason: executionStatusErrorReason,
      message: schema.string(),
    })
  ),
});

export const rawRuleSchema = rawRuleSchemaV3.extends({
  executionStatus: rawRuleExecutionStatusSchema,
  lastRun: schema.maybe(schema.nullable(rawRuleLastRunSchema)),
});
