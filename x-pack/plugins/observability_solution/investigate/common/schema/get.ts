/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';

const getInvestigationParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

const getInvestigationResponseSchema = investigationResponseSchema;

type GetInvestigationParams = t.TypeOf<typeof getInvestigationParamsSchema.props.path>; // Parsed payload used by the backend
type GetInvestigationResponse = t.OutputOf<typeof getInvestigationResponseSchema>; // Raw response sent to the frontend

export { getInvestigationParamsSchema, getInvestigationResponseSchema };
export type { GetInvestigationParams, GetInvestigationResponse };
