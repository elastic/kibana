/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rRuleResponseSchema = schema.object({
  dtstart: schema.string(),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.oneOf([
      schema.literal(0),
      schema.literal(1),
      schema.literal(2),
      schema.literal(3),
      schema.literal(4),
      schema.literal(5),
      schema.literal(6),
    ])
  ),
  until: schema.maybe(schema.string()),
  count: schema.maybe(schema.number()),
  interval: schema.maybe(schema.number()),
  wkst: schema.maybe(
    schema.oneOf([
      schema.literal('MO'),
      schema.literal('TU'),
      schema.literal('WE'),
      schema.literal('TH'),
      schema.literal('FR'),
      schema.literal('SA'),
      schema.literal('SU'),
    ])
  ),
  byweekday: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
  bymonth: schema.maybe(schema.arrayOf(schema.number())),
  bysetpos: schema.maybe(schema.arrayOf(schema.number())),
  bymonthday: schema.maybe(schema.arrayOf(schema.number())),
  byyearday: schema.maybe(schema.arrayOf(schema.number())),
  byweekno: schema.maybe(schema.arrayOf(schema.number())),
  byhour: schema.maybe(schema.arrayOf(schema.number())),
  byminute: schema.maybe(schema.arrayOf(schema.number())),
  bysecond: schema.maybe(schema.arrayOf(schema.number())),
});
