/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const GetPendingWorkflowInsightsRequestSchema = {
  query: schema.object({
    targetId: schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return 'targetId can not be an empty string';
        }
      },
    }),
    targetType: schema.oneOf([schema.literal('endpoint')]),
  }),
};

export type GetPendingWorkflowInsightsRequestQueryParams = TypeOf<
  typeof GetPendingWorkflowInsightsRequestSchema.query
>;
