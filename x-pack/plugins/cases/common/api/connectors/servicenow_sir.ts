/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const ServiceNowSIRFieldsSchema = z
  .object({
    category: z.nullable(z.string()),
    destIp: z.nullable(z.boolean()),
    malwareHash: z.nullable(z.boolean()),
    malwareUrl: z.nullable(z.boolean()),
    priority: z.nullable(z.string()),
    sourceIp: z.nullable(z.boolean()),
    subcategory: z.nullable(z.string()),
  })
  .strict();

export type ServiceNowSIRFieldsType = z.infer<typeof ServiceNowSIRFieldsSchema>;
