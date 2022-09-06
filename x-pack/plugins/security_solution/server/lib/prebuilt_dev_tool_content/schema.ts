/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ReadConsoleRequestSchema = {
  params: schema.object({
    console_id: schema.oneOf([
      schema.literal('enable_host_risk_score'),
      schema.literal('enable_user_risk_score'),
    ]),
  }),
};
