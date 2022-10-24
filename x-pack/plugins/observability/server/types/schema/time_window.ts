/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateType } from './common';
import { durationType } from './duration';

const rollingTimeWindowSchema = t.type({
  duration: durationType,
  is_rolling: t.literal<boolean>(true),
});

const calendarAlignedTimeWindowSchema = t.type({
  duration: durationType,
  calendar: t.type({ start_time: dateType }),
});

const timeWindowSchema = t.union([rollingTimeWindowSchema, calendarAlignedTimeWindowSchema]);

export { rollingTimeWindowSchema, calendarAlignedTimeWindowSchema, timeWindowSchema };
