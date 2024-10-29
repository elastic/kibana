/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const EnrollmentAPIKeySchema = schema.object({
  id: schema.string(),
  api_key_id: schema.string({
    meta: { description: 'The ID of the API key in the Security API.' },
  }),
  api_key: schema.string({
    meta: { description: 'The enrollment API key (token) used for enrolling Elastic Agents.' },
  }),
  name: schema.maybe(
    schema.string({
      meta: { description: 'The name of the enrollment API key.' },
    })
  ),
  active: schema.boolean({
    meta: {
      description:
        'When false, the enrollment API key is revoked and cannot be used for enrolling Elastic Agents.',
    },
  }),
  policy_id: schema.maybe(
    schema.string({
      meta: { description: 'The ID of the agent policy the Elastic Agent will be enrolled in.' },
    })
  ),
  created_at: schema.string(),
});
