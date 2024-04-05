/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const findBackfillQuerySchema = schema.object(
  {
    end: schema.maybe(schema.string()),
    page: schema.number({ defaultValue: 1, min: 1 }),
    perPage: schema.number({ defaultValue: 10, min: 0 }),
    ruleIds: schema.maybe(schema.string()),
    start: schema.maybe(schema.string()),
  },
  {
    validate({ ruleIds, start, end }) {
      if (!ruleIds && !start && !end) {
        return `Expected one of [ruleIds], [start], or [end] to be defined`;
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
