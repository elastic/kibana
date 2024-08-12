/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationNoteResponseSchema } from './investigation_note';

const createInvestigationNoteParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
  body: t.type({
    content: t.string,
  }),
});

const createInvestigationNoteResponseSchema = investigationNoteResponseSchema;

type createInvestigationNoteInput = t.OutputOf<
  typeof createInvestigationNoteParamsSchema.props.body
>;
type createInvestigationNoteParams = t.TypeOf<
  typeof createInvestigationNoteParamsSchema.props.body
>;
type createInvestigationNoteResponse = t.OutputOf<typeof createInvestigationNoteResponseSchema>;

export { createInvestigationNoteParamsSchema, createInvestigationNoteResponseSchema };
export type {
  createInvestigationNoteInput,
  createInvestigationNoteParams,
  createInvestigationNoteResponse,
};
