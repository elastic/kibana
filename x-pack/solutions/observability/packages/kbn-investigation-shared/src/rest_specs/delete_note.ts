/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const deleteInvestigationNoteParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
    noteId: z.string(),
  }),
});

type DeleteInvestigationNoteParams = z.infer<typeof deleteInvestigationNoteParamsSchema.shape.path>;

export { deleteInvestigationNoteParamsSchema };
export type { DeleteInvestigationNoteParams };
