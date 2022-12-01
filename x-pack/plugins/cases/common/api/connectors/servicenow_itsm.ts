/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const ServiceNowITSMFieldsSchema = z
  .object({
    impact: z.nullable(z.string()),
    severity: z.nullable(z.string()),
    urgency: z.nullable(z.string()),
    category: z.nullable(z.string()),
    subcategory: z.nullable(z.string()),
  })
  .strict();

export type ServiceNowITSMFieldsType = z.infer<typeof ServiceNowITSMFieldsSchema>;
