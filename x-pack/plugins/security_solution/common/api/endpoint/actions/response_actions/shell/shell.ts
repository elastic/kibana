/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

export const ShellActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.object({
      command: schema.string({
        minLength: 1,
        validate: (value) => {
          if (!value.trim().length) {
            return 'command cannot be an empty string';
          }
        },
      }),
      /**
       * The max timeout value before the command is killed. Number represents milliseconds
       */
      timeout: schema.maybe(schema.number({ min: 1 })),
    }),
  }),
};

export type ShellActionRequestBody = TypeOf<typeof ShellActionRequestSchema.body>;
