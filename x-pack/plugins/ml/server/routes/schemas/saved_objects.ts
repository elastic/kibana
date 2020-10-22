/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const jobsAndSpaces = schema.object({
  jobType: schema.string(),
  jobIds: schema.arrayOf(schema.string()),
  spaces: schema.arrayOf(schema.string()),
});

export const repairJobObjects = schema.object({ simulate: schema.maybe(schema.boolean()) });
