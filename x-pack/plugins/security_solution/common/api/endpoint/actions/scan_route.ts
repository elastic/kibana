/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from './common/base';

export const ScanActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,

    parameters: schema.object({
      path: schema.string({
        minLength: 1,
        validate: (value) => {
          if (!value.trim().length) {
            return 'path cannot be an empty string';
          }
        },
      }),
    }),
  }),
};

export type ScanActionRequestBody = TypeOf<typeof ScanActionRequestSchema.body>;
