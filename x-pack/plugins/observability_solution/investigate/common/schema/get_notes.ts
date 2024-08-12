/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationNoteResponseSchema } from './investigation_note';

const getInvestigationNotesParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const getInvestigationNotesResponseSchema = t.array(investigationNoteResponseSchema);

type GetInvestigationNotesResponse = t.OutputOf<typeof getInvestigationNotesResponseSchema>;

export { getInvestigationNotesParamsSchema, getInvestigationNotesResponseSchema };
export type { GetInvestigationNotesResponse };
