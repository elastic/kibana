/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { investigationResponseSchema } from './investigation';

const findInvestigationsByAlertParamsSchema = t.type({
  path: t.type({
    alertId: t.string,
  }),
});

const findInvestigationsByAlertResponseSchema = t.array(investigationResponseSchema);

type FindInvestigationsByAlertParams = t.TypeOf<
  typeof findInvestigationsByAlertParamsSchema.props.path
>; // Parsed payload used by the backend
type FindInvestigationsByAlertResponse = t.OutputOf<typeof findInvestigationsByAlertResponseSchema>; // Raw response sent to the frontend

export { findInvestigationsByAlertParamsSchema, findInvestigationsByAlertResponseSchema };
export type { FindInvestigationsByAlertParams, FindInvestigationsByAlertResponse };
