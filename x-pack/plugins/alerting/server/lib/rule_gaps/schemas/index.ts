/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { gapStatus } from '../../../../common/constants';

export const gapStatusSchema = schema.oneOf([
  schema.literal(gapStatus.UNFILLED),
  schema.literal(gapStatus.FILLED),
  schema.literal(gapStatus.PARTIALLY_FILLED),
]);

const rangeSchema = schema.object({
  lte: schema.string(),
  gte: schema.string(),
});

export const gapSchema = schema.object({
  _id: schema.string(),
  eventId: schema.string(),
  status: gapStatusSchema,
  range: rangeSchema,
  inProgressIntervals: schema.arrayOf(rangeSchema),
  filledIntervals: schema.arrayOf(rangeSchema),
  unfilledIntervals: schema.arrayOf(rangeSchema),
  totalGapDurationMs: schema.number(),
  filledDurationMs: schema.number(),
  unfilledDurationMs: schema.number(),
  inProgressDurationMs: schema.number(),
});

export const findGapsParamsSchema = schema.object(
  {
    end: schema.maybe(schema.string()),
    page: schema.number({ defaultValue: 1, min: 1 }),
    perPage: schema.number({ defaultValue: 10, min: 0 }),
    ruleIds: schema.arrayOf(schema.string()),
    start: schema.maybe(schema.string()),
    sortField: schema.maybe(schema.oneOf([schema.literal('@timestamp')])),
    sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  },
  {
    validate({ start, end }) {
      if (start) {
        const parsedStart = Date.parse(start);
        if (isNaN(parsedStart)) {
          return `[start]: query start must be valid date`;
        }
      }
      if (end) {
        const parsedEnd = Date.parse(end);
        if (isNaN(parsedEnd)) {
          return `[end]: query end must be valid date`;
        }
      }
    },
  }
);
