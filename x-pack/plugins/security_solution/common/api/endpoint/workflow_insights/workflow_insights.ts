/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const arrayWithNonEmptyString = (field: string) =>
  schema.arrayOf(
    schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return `${field} cannot be an empty string`;
        }
      },
    })
  );

export const UpdateWorkflowInsightRequestSchema = {
  params: schema.object({
    insightId: schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return 'insightId cannot be an empty string';
        }
      },
    }),
  }),
  body: schema.object({
    '@timestamp': schema.maybe(schema.string()),
    message: schema.maybe(schema.string()),
    category: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
    type: schema.maybe(
      schema.oneOf([schema.literal('incompatible_antivirus'), schema.literal('noisy_process_tree')])
    ),
    source: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('llm-connector')])),
        id: schema.maybe(schema.string()),
        data_range_start: schema.maybe(schema.string()),
        data_range_end: schema.maybe(schema.string()),
      })
    ),
    target: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
        ids: schema.maybe(arrayWithNonEmptyString('target.id')),
      })
    ),
    action: schema.maybe(
      schema.object({
        type: schema.maybe(
          schema.oneOf([
            schema.literal('refreshed'),
            schema.literal('remediated'),
            schema.literal('suppressed'),
            schema.literal('dismissed'),
          ])
        ),
        timestamp: schema.maybe(schema.string()),
      })
    ),
    value: schema.maybe(schema.string()),
    remediation: schema.maybe(
      schema.object({
        exception_list_items: schema.maybe(
          schema.arrayOf(
            schema.object({
              list_id: schema.maybe(schema.string()),
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              entries: schema.maybe(schema.arrayOf(schema.any())),
              tags: schema.maybe(arrayWithNonEmptyString('tag')),
              os_types: schema.maybe(arrayWithNonEmptyString('os_type')),
            })
          )
        ),
      })
    ),
    metadata: schema.maybe(
      schema.object({
        notes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
        message_variables: schema.maybe(arrayWithNonEmptyString('message_variable')),
      })
    ),
  }),
};

export const GetWorkflowInsightsRequestSchema = {
  query: schema.object({
    size: schema.maybe(schema.number()),
    from: schema.maybe(schema.number()),
    ids: schema.maybe(arrayWithNonEmptyString('ids')),
    categories: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('endpoint')]))),
    types: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('incompatible_antivirus'),
          schema.literal('noisy_process_tree'),
        ])
      )
    ),
    sourceTypes: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('llm-connector')]))),
    sourceIds: schema.maybe(arrayWithNonEmptyString('sourceId')),
    targetTypes: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('endpoint')]))),
    targetIds: schema.maybe(arrayWithNonEmptyString('targetId')),
    actionTypes: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('refreshed'),
          schema.literal('remediated'),
          schema.literal('suppressed'),
          schema.literal('dismissed'),
        ])
      )
    ),
  }),
};

export type GetWorkflowInsightsRequestQueryParams = TypeOf<
  typeof GetWorkflowInsightsRequestSchema.query
>;

export type UpdateWorkflowInsightsRequestParams = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.params
>;
export type UpdateWorkflowInsightsRequestBody = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.body
>;
