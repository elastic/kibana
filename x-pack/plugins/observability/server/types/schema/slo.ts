/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateTimeType, durationType } from './common';

const rollingTimeWindowSchema = t.type({
  is_rolling: t.literal<boolean>(true),
});

const calendarAlignedTimeWindowSchema = t.type({
  calendar: t.type({
    start_time: dateTimeType,
    time_zone: t.string,
  }),
});

const timeWindowSchema = t.intersection([
  t.type({ duration: durationType }),
  t.union([rollingTimeWindowSchema, calendarAlignedTimeWindowSchema]),
]);

type TimeWindow = t.TypeOf<typeof timeWindowSchema>;

const budgetingMethodSchema = t.literal('occurrences');

const objectiveSchema = t.type({
  target: t.number,
});

export {
  timeWindowSchema,
  calendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema,
  budgetingMethodSchema,
  objectiveSchema,
};

export type { TimeWindow };
