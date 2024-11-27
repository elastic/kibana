/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const GetWorkflowInsightsRequestSchema = {
  query: schema.object({
    size: schema.maybe(schema.number()),
    from: schema.maybe(schema.number()),
    ids: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          validate: (id) => {
            if (id.trim() === '') {
              return 'id can not be an empty string';
            }
          },
        })
      )
    ),
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
    sourceIds: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          validate: (id) => {
            if (id.trim() === '') {
              return 'sourceId can not be an empty string';
            }
          },
        })
      )
    ),
    targetTypes: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('endpoint')]))),
    targetIds: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          validate: (id) => {
            if (id.trim() === '') {
              return 'targetId can not be an empty string';
            }
          },
        })
      )
    ),
    actionTypes: schema.arrayOf(
      schema.oneOf([
        schema.literal('refreshed'),
        schema.literal('remediated'),
        schema.literal('suppressed'),
        schema.literal('dismissed'),
      ])
    ),
  }),
};

export type GetWorkflowInsightsRequestQueryParams = TypeOf<
  typeof GetWorkflowInsightsRequestSchema.query
>;
