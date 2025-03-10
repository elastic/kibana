/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationSchema } from '../schema';

const investigationResponseSchema = investigationSchema;

type InvestigationResponse = z.output<typeof investigationResponseSchema>;

export { investigationResponseSchema };
export type { InvestigationResponse };
