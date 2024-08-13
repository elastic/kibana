/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';

const findInvestigationsParamsSchema = t.partial({
  query: t.partial({
    page: t.string,
    perPage: t.string,
  }),
});

const findInvestigationsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(investigationResponseSchema),
});

type FindInvestigationsParams = t.TypeOf<typeof findInvestigationsParamsSchema.props.query>; // Parsed payload used by the backend
type FindInvestigationsResponse = t.OutputOf<typeof findInvestigationsResponseSchema>; // Raw response sent to the frontend

export { findInvestigationsParamsSchema, findInvestigationsResponseSchema };
export type { FindInvestigationsParams, FindInvestigationsResponse };
