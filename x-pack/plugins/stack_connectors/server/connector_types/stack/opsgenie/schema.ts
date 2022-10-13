/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
});

export const SecretsSchema = schema.object({
  apiKey: schema.string(),
});

const responderTypes = schema.oneOf([
  schema.literal('team'),
  schema.literal('user'),
  schema.literal('escalation'),
  schema.literal('schedule'),
]);

export const CreateAlertParamsSchema = schema.object({
  message: schema.string({ maxLength: 130 }),
  /**
   * The max length here should be 512 according to Opsgenie's docs but we will sha256 hash the alias if it is longer than 512
   * so we'll not impose a limit on the schema otherwise it'll get rejected prematurely.
   */
  alias: schema.maybe(schema.string()),
  description: schema.maybe(schema.string({ maxLength: 15000 })),
  responders: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.object({
          name: schema.string(),
          type: responderTypes,
        }),
        schema.object({ id: schema.string(), type: responderTypes }),
      ]),
      { maxSize: 50 }
    )
  ),
  visibleTo: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.object({
          name: schema.string(),
          type: schema.literal('team'),
        }),
        schema.object({
          id: schema.string(),
          type: schema.literal('team'),
        }),
        schema.object({
          id: schema.string(),
          type: schema.literal('user'),
        }),
        schema.object({
          username: schema.string(),
          type: schema.literal('user'),
        }),
      ]),
      { maxSize: 50 }
    )
  ),
  actions: schema.maybe(schema.arrayOf(schema.string({ maxLength: 50 }), { maxSize: 10 })),
  tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 50 }), { maxSize: 20 })),
  /**
   * The validation requirement here is that the total characters between the key and value do not exceed 8000. Opsgenie
   * will truncate the value if it would exceed the 8000 but it doesn't throw an error. Because of this I'm intentionally
   * not validating the length of the keys and values here.
   */
  details: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  entity: schema.maybe(schema.string({ maxLength: 512 })),
  source: schema.maybe(schema.string({ maxLength: 100 })),
  priority: schema.maybe(
    schema.oneOf([
      schema.literal('P1'),
      schema.literal('P2'),
      schema.literal('P3'),
      schema.literal('P4'),
      schema.literal('P5'),
    ])
  ),
  user: schema.maybe(schema.string({ maxLength: 100 })),
  note: schema.maybe(schema.string({ maxLength: 25000 })),
});

const SuccessfulResponse = schema.object(
  {
    took: schema.number(),
    requestId: schema.string(),
    result: schema.string(),
  },
  { unknowns: 'allow' }
);

const FailureResponse = schema.object(
  {
    took: schema.number(),
    requestId: schema.string(),
    message: schema.maybe(schema.string()),
    result: schema.maybe(schema.string()),
    errors: schema.maybe(schema.object({ message: schema.string() })),
  },
  { unknowns: 'allow' }
);

export const Response = schema.oneOf([SuccessfulResponse, FailureResponse]);

export const CloseAlertParamsSchema = schema.object({
  alias: schema.string(),
  user: schema.maybe(schema.string({ maxLength: 100 })),
  source: schema.maybe(schema.string({ maxLength: 100 })),
  note: schema.maybe(schema.string({ maxLength: 25000 })),
});
