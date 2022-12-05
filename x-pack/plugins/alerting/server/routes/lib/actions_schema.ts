/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationSchema } from '../../lib';

export const actionsSchema = schema.arrayOf(
  schema.object({
    group: schema.string(),
    id: schema.string(),
    params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    frequency: schema.maybe(
      schema.object({
        summary: schema.boolean(),
        notify_when: schema.oneOf([
          schema.literal('onActionGroupChange'),
          schema.literal('onActiveAlert'),
          schema.literal('onThrottleInterval'),
        ]),
        throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
      })
    ),
  }),
  { defaultValue: [] }
);
