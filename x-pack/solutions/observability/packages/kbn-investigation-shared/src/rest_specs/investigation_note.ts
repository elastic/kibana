/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationNoteSchema } from '../schema';

const investigationNoteResponseSchema = investigationNoteSchema;

type InvestigationNoteResponse = z.output<typeof investigationNoteResponseSchema>;

export { investigationNoteResponseSchema };
export type { InvestigationNoteResponse };
