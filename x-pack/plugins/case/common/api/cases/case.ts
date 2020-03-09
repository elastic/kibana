/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { CommentResponseRt } from './comment';
import { UserRT } from '../user';

const CaseBasicRt = rt.type({
  description: rt.string,
  state: rt.union([rt.literal('open'), rt.literal('closed')]),
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

export const CasesResponseRt = rt.type({
  cases: rt.array(CaseResponseRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const CasePatchRequestRt = rt.intersection([
  rt.partial(CaseRequestRt.props),
  rt.type({ id: rt.string, version: rt.string }),
]);

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CaseRequest = rt.TypeOf<typeof CaseRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
