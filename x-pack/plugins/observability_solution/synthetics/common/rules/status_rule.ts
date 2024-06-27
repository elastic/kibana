/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const TimeWindowSchema = schema.object({
  unit: schema.oneOf(
    [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
    {
      defaultValue: 'm',
    }
  ),
  size: schema.number({
    defaultValue: 5,
  }),
});

export const NumberOfChecksSchema = schema.object({
  numberOfChecks: schema.number({
    defaultValue: 5,
  }),
});

export const StatusRuleConditionSchema = schema.object({
  groupByLocation: schema.maybe(schema.boolean()),
  alertOnNoData: schema.maybe(schema.boolean()),
  downThreshold: schema.maybe(schema.number()),
  window: schema.oneOf([
    schema.object({
      percentOfLocations: schema.number(),
    }),
    schema.object({
      time: TimeWindowSchema,
    }),
    NumberOfChecksSchema,
  ]),
});

export const StatusRulePramsSchema = schema.object({
  condition: schema.maybe(StatusRuleConditionSchema),
  filters: schema.maybe(schema.arrayOf(schema.any())),
  monitorIds: schema.maybe(schema.arrayOf(schema.string())),
  locations: schema.maybe(schema.arrayOf(schema.string())),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  monitorTypes: schema.maybe(schema.arrayOf(schema.string())),
  projects: schema.maybe(schema.arrayOf(schema.string())),
  kqlQuery: schema.maybe(schema.string()),
});

export type TimeWindow = TypeOf<typeof TimeWindowSchema>;
export type StatusRuleParams = TypeOf<typeof StatusRulePramsSchema>;
export type StatusRuleCondition = TypeOf<typeof StatusRuleConditionSchema>;

export const getConditionType = (condition?: StatusRuleCondition) => {
  let numberOfChecks = 1;
  const isLocationBased = condition && 'percentOfLocations' in condition.window;
  const isTimeWindow = condition && 'time' in condition.window;
  const isChecksBased = condition && 'numberOfChecks' in condition.window;

  if (isChecksBased) {
    numberOfChecks =
      condition && 'numberOfChecks' in condition?.window ? condition.window.numberOfChecks : 1;
  }

  if (isTimeWindow || isLocationBased) {
    numberOfChecks = condition?.downThreshold ?? 1;
  }

  const percentOfLocations =
    condition && 'percentOfLocations' in condition.window
      ? condition.window.percentOfLocations ?? 100
      : 100;

  return {
    isLocationBased,
    isTimeWindow,
    isChecksBased,
    numberOfChecks,
    percentOfLocations,
    downThreshold: condition?.downThreshold ?? 1,
  };
};
