/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { FromSchema } from 'json-schema-to-ts';

export const transformFunctionDefinition = {
  name: 'transform_create',
  contexts: ['core'],
  description:
    dedent(`Use this function to create Elasticsearch transforms. This function does not return data to the assistant, it only shows it to the user.

    Ask the user if they want to provide an ingest pipeline, if they do, use that, otherwise, omit pipeline in the request.

    When using this function, make sure to use the recall function to get more information about how to use it, with how you want to use it.

    Make sure the query also contains information about the user's request.`),
  descriptionForUser: 'Use this function to create Elasticsearch transforms.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      transform_id: { type: 'string' },
      description: {
        type: 'string',
      },
      dest: {
        type: 'object',
        properties: {
          index: { type: 'string' },
          pipeline: { type: 'string' },
        },
        required: ['index'],
      },
      frequency: {
        type: 'string',
      },
      source: {
        type: 'object',
        properties: {
          index: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            ],
          },
          query: {
            type: ['object', 'boolean'],
          },
        },
        required: ['index'],
      },
      sync: {
        type: 'object',
        properties: {
          time: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              delay: { type: 'string' },
            },
            required: ['field'],
          },
        },
      },
      pivot: {
        type: 'object',
        properties: {
          group_by: {
            type: 'object',
          },
          aggregations: {
            type: 'object',
          },
        },
        required: ['group_by', 'aggregations'],
      },
      latest: {
        type: 'object',
        properties: {
          unique_key: { type: 'array', items: { type: 'string' } },
          sort: { type: 'string' },
        },
        required: ['unique_key', 'sort'],
      },
      retention_policy: {
        type: 'object',
        properties: {
          time: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              max_age: { type: 'string' },
            },
            required: ['field', 'max_age'],
          },
        },
      },
      settings: {
        type: 'object',
        properties: {
          align_checkpoints: { type: 'boolean' },
          dates_as_epoch_millis: { type: 'boolean' },
          deduce_mappings: { type: 'boolean' },
          docs_per_second: { type: 'number' },
          max_page_search_size: { type: 'integer' },
          num_failure_retries: { type: 'integer' },
          unattended: { type: 'boolean' },
        },
      },
    },
    required: ['transform_id', 'dest', 'source'],
  } as const,
};

export type TransformFunctionArguments = FromSchema<
  typeof transformFunctionDefinition['parameters']
>;
