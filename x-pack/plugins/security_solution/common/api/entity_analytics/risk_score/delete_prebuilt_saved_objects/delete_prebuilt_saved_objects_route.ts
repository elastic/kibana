/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const deletePrebuiltSavedObjectsRequestBody = {
  params: schema.object({
    template_name: schema.oneOf([
      schema.literal('hostRiskScoreDashboards'),
      schema.literal('userRiskScoreDashboards'),
    ]),
  }),
  body: schema.nullable(schema.object({ deleteAll: schema.maybe(schema.boolean()) })),
};
