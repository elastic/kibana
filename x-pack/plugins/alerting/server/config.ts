/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { validateDurationSchema } from './lib';

const ruleTypeConfig = schema.object({
  id: schema.string(),
  timeout: schema.maybe(schema.string({ validate: validateDurationSchema })),
});

const ruleExecutionSchema = schema.object({
  timeout: schema.maybe(schema.string({ validate: validateDurationSchema, defaultValue: '5m' })),
  actions: schema.object({
    max: schema.number({ defaultValue: 100000 }),
  }),
  ruleTypeOverrides: schema.maybe(schema.arrayOf(ruleTypeConfig)),
});

export const DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT = 10;
export const configSchema = schema.object({
  healthCheck: schema.object({
    interval: schema.string({ validate: validateDurationSchema, defaultValue: '60m' }),
  }),
  invalidateApiKeysTask: schema.object({
    interval: schema.string({ validate: validateDurationSchema, defaultValue: '5m' }),
    removalDelay: schema.string({ validate: validateDurationSchema, defaultValue: '1h' }),
  }),
  maxEphemeralActionsPerAlert: schema.number({
    defaultValue: DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT,
  }),
  defaultRuleTaskTimeout: schema.string({ validate: validateDurationSchema, defaultValue: '5m' }),
  cancelAlertsOnRuleTimeout: schema.boolean({ defaultValue: true }),
  minimumScheduleInterval: schema.string({ validate: validateDurationSchema, defaultValue: '1m' }),
  rules: schema.object({
    execution: ruleExecutionSchema,
  }),
});

export type AlertingConfig = TypeOf<typeof configSchema>;
export type PublicAlertingConfig = Pick<AlertingConfig, 'minimumScheduleInterval'>;
export type RuleExecutionConfig = TypeOf<typeof ruleExecutionSchema>;
export type RuleTypeConfig = Omit<RuleExecutionConfig, 'ruleTypeOverrides'>;
