/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { validateBackfillSchedule } from '../../../../..';
import { MAX_SCHEDULE_BACKFILL_BULK_SIZE } from '../../../../../constants';
import { backfillResponseSchemaV1, errorResponseSchemaV1 } from '../../../response';

export const scheduleBodySchema = schema.arrayOf(
  schema.object(
    {
      rule_id: schema.string(),
      start: schema.string(),
      end: schema.maybe(schema.string()),
    },
    {
      validate({ start, end }) {
        return validateBackfillSchedule(start, end);
      },
    }
  ),
  { minSize: 1, maxSize: MAX_SCHEDULE_BACKFILL_BULK_SIZE }
);

export const scheduleResponseSchema = schema.arrayOf(
  schema.oneOf([backfillResponseSchemaV1, errorResponseSchemaV1])
);
