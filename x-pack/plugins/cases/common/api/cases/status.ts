/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export enum CaseStatuses {
  open = 'open',
  'in-progress' = 'in-progress',
  closed = 'closed',
}

export const CaseStatusRt = rt.union([
  rt.literal(CaseStatuses.open),
  rt.literal(CaseStatuses['in-progress']),
  rt.literal(CaseStatuses.closed),
]);

export const caseStatuses = Object.values(CaseStatuses);

export const CasesStatusResponseRt = rt.type({
  count_open_cases: rt.number,
  count_in_progress_cases: rt.number,
  count_closed_cases: rt.number,
});

export const CasesStatusRequestRt = rt.partial({
  /**
   * A KQL date. If used all cases created after (gte) the from date will be returned
   */
  from: rt.string,
  /**
   * A KQL date. If used all cases created before (lte) the to date will be returned.
   */
  to: rt.string,
  /**
   * The owner of the cases to retrieve the status stats from. If no owner is provided the stats for all cases
   * that the user has access to will be returned.
   */
  owner: rt.union([rt.array(rt.string), rt.string]),
});

export type CasesStatusResponse = rt.TypeOf<typeof CasesStatusResponseRt>;
export type CasesStatusRequest = rt.TypeOf<typeof CasesStatusRequestRt>;
