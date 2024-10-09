/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { isEmpty } from 'lodash';

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
    min: 1,
    max: 100,
  }),
});

export const StatusRuleConditionSchema = schema.object({
  groupBy: schema.maybe(
    schema.string({
      defaultValue: 'locationId',
    })
  ),
  downThreshold: schema.maybe(
    schema.number({
      defaultValue: 3,
    })
  ),
  locationsThreshold: schema.maybe(
    schema.number({
      defaultValue: 1,
    })
  ),
  window: schema.oneOf([
    schema.object({
      time: TimeWindowSchema,
    }),
    NumberOfChecksSchema,
  ]),
  includeRetests: schema.maybe(schema.boolean()),
});

export const StatusRulePramsSchema = schema.object({
  condition: schema.maybe(StatusRuleConditionSchema),
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
  let timeWindow: TimeWindow = { unit: 'm', size: 1 };
  if (isEmpty(condition) || !condition?.window) {
    return {
      isLocationBased: false,
      useTimeWindow: false,
      timeWindow,
      useLatestChecks: true,
      numberOfChecks,
      downThreshold: 1,
      locationsThreshold: 1,
      isDefaultRule: true,
    };
  }
  const useTimeWindow = condition.window && 'time' in condition.window;
  const useLatestChecks = condition.window && 'numberOfChecks' in condition.window;

  if (useLatestChecks) {
    numberOfChecks =
      condition && 'numberOfChecks' in condition.window ? condition.window.numberOfChecks : 1;
  }

  if (useTimeWindow) {
    timeWindow = condition.window.time;
    numberOfChecks = condition?.downThreshold ?? 1;
  }

  return {
    useTimeWindow,
    timeWindow,
    useLatestChecks,
    numberOfChecks,
    locationsThreshold: condition?.locationsThreshold ?? 1,
    downThreshold: condition?.downThreshold ?? 1,
    isDefaultRule: isEmpty(condition),
  };
};
