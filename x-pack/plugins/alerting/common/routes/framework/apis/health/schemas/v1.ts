/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const alertingFrameworkHealthSchemaObject = {
  status: schema.oneOf([schema.literal('ok'), schema.literal('warn'), schema.literal('error')]),
  timestamp: schema.string(),
};

export const healthFrameworkResponseBodySchema = schema.object({
  is_sufficiently_secure: schema.boolean({
    meta: {
      description: 'If false, security is enabled but TLS is not.',
    },
  }),
  has_permanent_encryption_key: schema.boolean({
    meta: {
      description: 'If false, the encryption key is not set',
    },
  }),
  alerting_framework_health: schema.object(
    {
      decryption_health: schema.object(alertingFrameworkHealthSchemaObject, {
        meta: { description: 'The timestamp and status of the alert decryption.' },
      }),
      execution_health: schema.object(alertingFrameworkHealthSchemaObject, {
        meta: { description: 'The timestamp and status of the alert execution.' },
      }),
      read_health: schema.object(alertingFrameworkHealthSchemaObject, {
        meta: { description: 'The timestamp and status of the alert reading events.' },
      }),
    },
    {
      meta: {
        description:
          'Three substates identify the health of the alerting framework: decryptionHealth, executionHealth, and readHealth.',
      },
    }
  ),
});

export const healthFrameworkResponseSchema = schema.object({
  body: healthFrameworkResponseBodySchema,
});
