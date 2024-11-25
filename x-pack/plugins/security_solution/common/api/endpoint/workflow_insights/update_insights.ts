/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const UpdateWorkflowInsightRequestSchema = {
  params: schema.object({
    insightId: schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return 'insightId can not be an empty string';
        }
      },
    }),
  }),
  body: schema.object({}),
};

export type UpdateWorkflowInsightsRequestParams = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.params
>;
export type UpdateWorkflowInsightsRequestBody = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.body
>;
