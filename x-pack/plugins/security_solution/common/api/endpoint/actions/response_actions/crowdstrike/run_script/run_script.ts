/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../../common/base';

export const RunScriptActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.object({
      /**
       * The script to run
       */
      Raw: schema.maybe(
        schema.string({
          minLength: 1,
          validate: (value) => {
            if (!value.trim().length) {
              return 'Raw cannot be an empty string';
            }
          },
        })
      ),
      /**
       * The path to the script on the host to run
       */
      HostPath: schema.maybe(
        schema.string({
          minLength: 1,
          validate: (value) => {
            if (!value.trim().length) {
              return 'HostPath cannot be an empty string';
            }
          },
        })
      ),
      /**
       * The path to the script in the cloud to run
       */
      CloudFile: schema.maybe(
        schema.string({
          minLength: 1,
          validate: (value) => {
            if (!value.trim().length) {
              return 'CloudFile cannot be an empty string';
            }
          },
        })
      ),
      /**
       * The command line to run
       */
      CommandLine: schema.maybe(
        schema.string({
          minLength: 1,
          validate: (value) => {
            if (!value.trim().length) {
              return 'CommandLine cannot be an empty string';
            }
          },
        })
      ),
      /**
       * The max timeout value before the command is killed. Number represents milliseconds
       */
      Timeout: schema.maybe(schema.number({ min: 1 })),
    }),
  }),
};

export type RunScriptActionRequestBody = TypeOf<typeof RunScriptActionRequestSchema.body>;
