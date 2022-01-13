/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { UserRT } from '../user';
import { CommentResponseRt } from './comment';
import { CaseStatusRt } from './status';

const SubCaseBasicRt = rt.type({
  /**
   * The status of the sub case (open, closed, in-progress)
   */
  status: CaseStatusRt,
});

const SubCaseAttributesRt = rt.intersection([
  SubCaseBasicRt,
  rt.type({
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRT, rt.null]),
    created_at: rt.string,
    created_by: rt.union([UserRT, rt.null]),
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
    owner: rt.string,
  }),
]);

const SubCaseResponseRt = rt.intersection([
  SubCaseAttributesRt,
  rt.type({
    id: rt.string,
    totalComment: rt.number,
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.partial({
    comments: rt.array(CommentResponseRt),
  }),
]);

const SubCasePatchRequestRt = rt.intersection([
  rt.partial(SubCaseBasicRt.props),
  rt.type({ id: rt.string, version: rt.string }),
]);

const SubCasesResponseRt = rt.array(SubCaseResponseRt);

export type SubCaseResponse = rt.TypeOf<typeof SubCaseResponseRt>;
export type SubCasesResponse = rt.TypeOf<typeof SubCasesResponseRt>;
export type SubCasePatchRequest = rt.TypeOf<typeof SubCasePatchRequestRt>;
