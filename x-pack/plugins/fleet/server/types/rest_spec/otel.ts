/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { VarsRecordSchema } from '../models';

const createOtelPolicyRequestBodySchema = schema.object({
  id: schema.maybe(
    schema.string({
      meta: {
        description: 'Package policy unique identifier',
      },
    })
  ),
  name: schema.string({
    meta: {
      description: 'Otel policy name (should be unique)',
    },
  }),
  description: schema.maybe(
    schema.string({
      meta: {
        description: 'Otel policy description',
      },
    })
  ),
  namespace: schema.maybe(
    schema.string({
      meta: {
        description: 'Otel policy namespace',
      },
    })
  ),
  output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  policy_ids: schema.arrayOf(
    schema.string({
      meta: {
        description: 'Agent policy IDs where that Otel policy will be added',
      },
    })
  ),
  integration: schema.maybe(
    schema.object({
      name: schema.string({
        meta: {
          description: 'Integration name',
        },
      }),
      version: schema.maybe(
        schema.string({
          meta: {
            description: 'Integration version',
          },
        })
      ),
    })
  ),
  pipelines: schema.maybe(schema.arrayOf(schema.string())),
  vars: schema.maybe(VarsRecordSchema),
});

export const CreateOtelPolicyRequestSchema = {
  body: createOtelPolicyRequestBodySchema,
};

export const InstallOtelIntegrationRequestSchema = {
  params: schema.object({
    name: schema.string(),
  }),
  body: schema.any(),
};
