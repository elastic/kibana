/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const ResilientFieldsSchema = z
  .object({
    incidentTypes: z.nullable(z.array(z.string())),
    severityCode: z.nullable(z.string()),
  })
  .strict();

export type ResilientFieldsType = z.infer<typeof ResilientFieldsSchema>;
