/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

const { parameters, ...restBaseSchema } = BaseActionRequestSchema;
const NonEmptyString = schema.string({
  minLength: 1,
  validate: (value) => {
    if (!value.trim().length) {
      return 'Raw cannot be an empty string';
    }
  },
});
export const RunScriptActionRequestSchema = {
  body: schema.object({
    ...restBaseSchema,
    parameters: schema.object(
      {
        /**
         * The script to run
         */
        Raw: schema.maybe(NonEmptyString),
        /**
         * The path to the script on the host to run
         */
        HostPath: schema.maybe(NonEmptyString),
        /**
         * The path to the script in the cloud to run
         */
        CloudFile: schema.maybe(NonEmptyString),
        /**
         * The command line to run
         */
        CommandLine: schema.maybe(NonEmptyString),
        /**
         * The max timeout value before the command is killed. Number represents milliseconds
         */
        Timeout: schema.maybe(schema.number({ min: 1 })),
      },
      {
        validate: (params) => {
          if (!params.Raw && !params.HostPath && !params.CloudFile) {
            return 'At least one of Raw, HostPath, or CloudFile must be provided';
          }
        },
      }
    ),
  }),
};

export type RunScriptActionRequestBody = TypeOf<typeof RunScriptActionRequestSchema.body>;
