/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export enum CaseStatuses {
  all = 'all',
  open = 'open',
  'in-progress' = 'in-progress',
  closed = 'closed',
}

export const CaseStatusRt = rt.union([
  rt.literal(CaseStatuses.all),
  rt.literal(CaseStatuses.open),
  rt.literal(CaseStatuses['in-progress']),
  rt.literal(CaseStatuses.closed),
]);

export const caseStatuses = Object.values(CaseStatuses);

export const CasesStatusResponseRt = rt.type({
  count_all_cases: rt.number,
  count_open_cases: rt.number,
  count_in_progress_cases: rt.number,
  count_closed_cases: rt.number,
});

export type CasesStatusResponse = rt.TypeOf<typeof CasesStatusResponseRt>;

export const SubCasesStatusResponseRt = rt.type({
  count_open_cases: rt.number,
  count_in_progress_cases: rt.number,
  count_closed_cases: rt.number,
});

export type SubCasesStatusResponse = rt.TypeOf<typeof SubCasesStatusResponseRt>;
