/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';

export const rRuleResponseZodSchema = z.object({
  dtstart: z.string(),
  tzid: z.string(),
  freq: z.optional(
    z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ])
  ),
  until: z.optional(z.string()),
  count: z.optional(z.number()),
  interval: z.optional(z.number()),
  wkst: z.optional(
    z.union([
      z.literal('MO'),
      z.literal('TU'),
      z.literal('WE'),
      z.literal('TH'),
      z.literal('FR'),
      z.literal('SA'),
      z.literal('SU'),
    ])
  ),
  byweekday: z.optional(z.array(z.union([z.string(), z.number()]))),
  bymonth: z.optional(z.array(z.number())),
  bysetpos: z.optional(z.array(z.number())),
  bymonthday: z.optional(z.array(z.number())),
  byyearday: z.optional(z.array(z.number())),
  byweekno: z.optional(z.array(z.number())),
  byhour: z.optional(z.array(z.number())),
  byminute: z.optional(z.array(z.number())),
  bysecond: z.optional(z.array(z.number())),
});
