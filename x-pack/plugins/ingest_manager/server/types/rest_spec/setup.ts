/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const PostFleetSetupRequestSchema = {
  body: schema.nullable(
    schema.object({
      forceRecreate: schema.maybe(schema.boolean()),
    })
  ),
};
