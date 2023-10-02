/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from './common/base';

export const UploadActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,

    parameters: schema.object({
      overwrite: schema.maybe(schema.boolean({ defaultValue: false })),
    }),

    file: schema.stream(),
  }),
};

/** Type used by the server's API for `upload` action */
export type UploadActionApiRequestBody = TypeOf<typeof UploadActionRequestSchema.body>;

/**
 * Type used on the UI side. The `file` definition is different on the UI side, thus the
 * need for a separate type.
 */
export type UploadActionUIRequestBody = Omit<UploadActionApiRequestBody, 'file'> & {
  file: File;
};
