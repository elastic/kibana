/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { backfillResponseSchemaV1 } from '../../../response';

export const findQuerySchema = schema.object(
  {
    end: schema.maybe(schema.string()),
    page: schema.number({ defaultValue: 1, min: 1 }),
    per_page: schema.number({ defaultValue: 10, min: 0 }),
    rule_ids: schema.maybe(schema.string()),
    start: schema.maybe(schema.string()),
  },
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    validate({ rule_ids, start, end }) {
      if (!rule_ids && !start && !end) {
        return `Expected one of [rule_ids], [start], or [end] to be defined`;
      }

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

export const findResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(backfillResponseSchemaV1),
});
