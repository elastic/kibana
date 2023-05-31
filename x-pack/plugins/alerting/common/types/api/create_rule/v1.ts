/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import {
  validateDurationV1,
  validateHoursV1,
  validateTimezoneV1,
  validateNotifyWhenTypeV1,
  ruleV1,
} from '..';

export type RulesClientCreateData = TypeOf<typeof rulesClientCreateDataSchema>;
export type RulesClientCreateOptions = TypeOf<typeof rulesClientCreateOptionsSchema>;

export type CreateRuleActionData = TypeOf<typeof actionSchema>;
export type CreateRuleActionFrequencyData = TypeOf<typeof actionFrequencySchema>;

export type CreateRuleActionRequestBody = Omit<
  CreateRuleActionData,
  'frequency' | 'alertsFilter'
> & {
  frequency: Omit<CreateRuleActionFrequencyData, 'notifyWhen'> & {
    notify_when: CreateRuleActionFrequencyData['notifyWhen'];
  };
  alerts_filter: CreateRuleActionData['alertsFilter'];
};

export interface CreateRuleRequestParams {
  id?: string;
}

export type CreateRuleRequestBody = Omit<
  RulesClientCreateData,
  'alertTypeId' | 'notifyWhen' | 'actions'
> & {
  rule_type_id: RulesClientCreateData['alertTypeId'];
  notify_when: RulesClientCreateData['notifyWhen'];
  actions: CreateRuleActionRequestBody[];
};

export interface CreateRuleResponse {
  body: ruleV1.RuleResponse;
}

const notifyWhenSchema = schema.oneOf(
  [
    schema.literal(ruleV1.RuleNotifyWhen.CHANGE),
    schema.literal(ruleV1.RuleNotifyWhen.ACTIVE),
    schema.literal(ruleV1.RuleNotifyWhen.THROTTLE),
  ],
  { validate: validateNotifyWhenTypeV1.validateNotifyWhenType }
);

const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notifyWhen: notifyWhenSchema,
  throttle: schema.nullable(schema.string({ validate: validateDurationV1.validateDuration })),
});

const actionSchema = schema.object({
  group: schema.string(),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  frequency: schema.maybe(actionFrequencySchema),
  uuid: schema.maybe(schema.string()),
  alertsFilter: schema.maybe(
    schema.object({
      query: schema.maybe(
        schema.object({
          kql: schema.string(),
          filters: schema.arrayOf(
            schema.object({
              query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
              meta: schema.recordOf(schema.string(), schema.any()),
              state$: schema.maybe(schema.object({ store: schema.string() })),
            })
          ),
          dsl: schema.maybe(schema.string()),
        })
      ),
      timeframe: schema.maybe(
        schema.object({
          days: schema.arrayOf(
            schema.oneOf([
              schema.literal(1),
              schema.literal(2),
              schema.literal(3),
              schema.literal(4),
              schema.literal(5),
              schema.literal(6),
              schema.literal(7),
            ])
          ),
          hours: schema.object({
            start: schema.string({
              validate: validateHoursV1.validateHours,
            }),
            end: schema.string({
              validate: validateHoursV1.validateHours,
            }),
          }),
          timezone: schema.string({ validate: validateTimezoneV1.validateTimezone }),
        })
      ),
    })
  ),
});

export const rulesClientCreateDataSchema = schema.object({
  name: schema.string(),
  alertTypeId: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(
    schema.nullable(schema.string({ validate: validateDurationV1.validateDuration }))
  ),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationV1.validateDuration }),
  }),
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
});

export const rulesClientCreateOptionsSchema = schema.object({
  id: schema.maybe(schema.string()),
});
