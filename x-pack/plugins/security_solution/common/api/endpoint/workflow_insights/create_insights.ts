/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const nonEmptyString = schema.string({
  minLength: 1,
  validate: (id) => {
    if (id.trim() === '') {
      return 'value can not be an empty string';
    }
  },
});

export const CreateWorkflowInsightsRequestSchema = {
  body: schema.object({
    endpointIds: schema.arrayOf(nonEmptyString),
    insightType: schema.oneOf([
      schema.literal('incompatible_antivirus'),
      schema.literal('noisy_process_tree'),
    ]),
    anonymizationFields: schema.conditional(
      schema.siblingRef('insightType'),
      'incompatible_antivirus',
      schema.arrayOf(
        schema.object({
          id: nonEmptyString,
          timestamp: schema.maybe(nonEmptyString),
          field: schema.string(),
          allowed: schema.maybe(schema.boolean()),
          anonymized: schema.maybe(schema.boolean()),
          updatedAt: schema.maybe(schema.string()),
          updatedBy: schema.maybe(schema.string()),
          createdAt: schema.maybe(schema.string()),
          createdBy: schema.maybe(schema.string()),
          namespace: schema.maybe(schema.string()),
        })
      ),
      schema.maybe(schema.arrayOf(schema.object({})))
    ),
    apiConfig: schema.conditional(
      schema.siblingRef('insightType'),
      'incompatible_antivirus',
      schema.object({
        connectorId: schema.string(),
        actionTypeId: schema.string(),
        defaultSystemPromptId: schema.maybe(schema.string()),
        provider: schema.maybe(
          schema.oneOf([
            schema.literal('OpenAI'),
            schema.literal('Azure OpenAI'),
            schema.literal('Other'),
          ])
        ),
        model: schema.maybe(schema.string()),
      }),
      schema.maybe(schema.object({}))
    ),
    langSmithProject: schema.maybe(schema.string()),
    langSmithApiKey: schema.maybe(schema.string()),
    model: schema.maybe(schema.string()),
    replacements: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    subAction: schema.conditional(
      schema.siblingRef('insightType'),
      'incompatible_antivirus',
      schema.oneOf([schema.literal('invokeAI'), schema.literal('invokeStream')]),
      schema.maybe(schema.oneOf([schema.literal('invokeAI'), schema.literal('invokeStream')]))
    ),
  }),
};

export type CreateWorkflowInsightsRequestBody = TypeOf<
  typeof CreateWorkflowInsightsRequestSchema.body
>;
