/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { NumberFromString } from '../saved_object';
import { UserRT } from '../user';
import { CommentResponseRt } from './comment';
import { CasesStatusResponseRt } from './status';

const StatusRt = rt.union([rt.literal('open'), rt.literal('closed')]);

const CaseBasicRt = rt.type({
  description: rt.string,
  status: StatusRt,
  tags: rt.array(rt.string),
  title: rt.string,
});

export const CaseAttributesRt = rt.intersection([
  CaseBasicRt,
  rt.type({
    comment_ids: rt.array(rt.string),
    created_at: rt.string,
    created_by: UserRT,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
  }),
]);

export const CaseRequestRt = CaseBasicRt;

export const CasesFindRequestRt = rt.partial({
  tags: rt.union([rt.array(rt.string), rt.string]),
  status: StatusRt,
  reporters: rt.union([rt.array(rt.string), rt.string]),
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  fields: rt.array(rt.string),
  page: NumberFromString,
  perPage: NumberFromString,
  search: rt.string,
  searchFields: rt.array(rt.string),
  sortField: rt.string,
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

export const CaseResponseRt = rt.intersection([
  CaseAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
  rt.partial({
    comments: rt.array(CommentResponseRt),
  }),
]);

export const CasesFindResponseRt = rt.intersection([
  rt.type({
    cases: rt.array(CaseResponseRt),
    page: rt.number,
    per_page: rt.number,
    total: rt.number,
  }),
  CasesStatusResponseRt,
]);

export const CasePatchRequestRt = rt.intersection([
  rt.partial(CaseRequestRt.props),
  rt.type({ id: rt.string, version: rt.string }),
]);

export const CasesPatchRequestRt = rt.type({ cases: rt.array(CasePatchRequestRt) });
export const CasesResponseRt = rt.array(CaseResponseRt);

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CaseRequest = rt.TypeOf<typeof CaseRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
