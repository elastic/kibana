/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';

const createInvestigationParamsSchema = t.type({
  body: t.type({
    id: t.string,
    title: t.string,
    parameters: t.type({
      timeRange: t.type({ from: t.number, to: t.number }),
    }),
  }),
});

const createInvestigationResponseSchema = investigationResponseSchema;

type CreateInvestigationInput = t.OutputOf<typeof createInvestigationParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateInvestigationParams = t.TypeOf<typeof createInvestigationParamsSchema.props.body>; // Parsed payload used by the backend
type CreateInvestigationResponse = t.OutputOf<typeof createInvestigationResponseSchema>; // Raw response sent to the frontend

export { createInvestigationParamsSchema, createInvestigationResponseSchema };
export type { CreateInvestigationInput, CreateInvestigationParams, CreateInvestigationResponse };
