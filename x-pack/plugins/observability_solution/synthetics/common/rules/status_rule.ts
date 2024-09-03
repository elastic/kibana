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

export const numberOfLocationsSchema = schema.object({
  numberOfLocations: schema.number({
    defaultValue: 1,
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
  downThreshold: schema.maybe(schema.number()),
  window: schema.oneOf([
    schema.intersection([
      schema.object({
        time: TimeWindowSchema,
      }),
      numberOfLocationsSchema,
    ]),
    schema.intersection([NumberOfChecksSchema, numberOfLocationsSchema]),
  ]),
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
      isTimeWindow: false,
      timeWindow,
      isChecksBased: true,
      numberOfChecks,
      downThreshold: 1,
      numberOfLocations: 1,
    };
  }
  const conWindow = condition.window;
  const isTimeWindow = conWindow && 'time' in condition.window;
  const isChecksBased = conWindow && 'numberOfChecks' in condition.window;

  if (isChecksBased) {
    numberOfChecks = condition && 'numberOfChecks' in conWindow ? conWindow.numberOfChecks : 1;
  }

  if (isTimeWindow) {
    timeWindow = condition.window.time;
    numberOfChecks = condition?.downThreshold ?? 1;
  }

  const numberOfLocations =
    conWindow && 'numberOfLocations' in conWindow ? conWindow.numberOfLocations ?? 1 : 1;

  return {
    isTimeWindow,
    timeWindow,
    isChecksBased,
    numberOfChecks,
    numberOfLocations,
    downThreshold: condition?.downThreshold ?? 1,
  };
};
