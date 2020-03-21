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

export { ActionTypeExecutorResult } from '../../../../actions/server/types';

const StatusRt = rt.union([rt.literal('open'), rt.literal('closed')]);

const CaseBasicRt = rt.type({
  description: rt.string,
  status: StatusRt,
  tags: rt.array(rt.string),
  title: rt.string,
});

const CasePushBasicRt = rt.type({
  connector_id: rt.string,
  connector_name: rt.string,
  external_id: rt.string,
  external_title: rt.string,
  external_url: rt.string,
});

const CasePushedBasicRt = rt.union([
  rt.intersection([
    CasePushBasicRt,
    rt.type({
      at: rt.string,
      by: UserRT,
    }),
  ]),
  rt.null,
]);

export const CaseAttributesRt = rt.intersection([
  CaseBasicRt,
  rt.type({
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRT, rt.null]),
    created_at: rt.string,
    created_by: UserRT,
    pushed: CasePushedBasicRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
  }),
]);

export const CaseRequestRt = CaseBasicRt;

export const CasePushRequestRt = CasePushBasicRt;

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
    totalComment: rt.number,
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

/*
 * This type are related to this file below
 * x-pack/plugins/actions/server/builtin_action_types/servicenow/schema.ts
 * why because this schema is not share in a common folder
 * so we redefine then so we can use/validate types
 */

const PushCaseUserParams = rt.type({
  fullName: rt.union([rt.string, rt.null]),
  username: rt.string,
});

export const PushCommentParamsRt = rt.type({
  commentId: rt.string,
  comment: rt.string,
  createdAt: rt.string,
  createdBy: PushCaseUserParams,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([PushCaseUserParams, rt.null]),
});

export const PushCaseParamsRt = rt.intersection([
  rt.type({
    caseId: rt.string,
    createdAt: rt.string,
    createdBy: PushCaseUserParams,
    incidentId: rt.union([rt.string, rt.null]),
    title: rt.string,
    updatedAt: rt.union([rt.string, rt.null]),
    updatedBy: rt.union([PushCaseUserParams, rt.null]),
  }),
  rt.partial({
    description: rt.string,
    comments: rt.array(PushCommentParamsRt),
  }),
]);

export const PushCaseResponseRt = rt.intersection([
  rt.type({
    number: rt.string,
    incidentId: rt.string,
    pushedDate: rt.string,
    url: rt.string,
  }),
  rt.partial({
    comments: rt.array(
      rt.type({
        commentId: rt.string,
        pushedDate: rt.string,
      })
    ),
  }),
]);

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CaseRequest = rt.TypeOf<typeof CaseRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type CasePushRequest = rt.TypeOf<typeof CasePushRequestRt>;
export type PushCaseParams = rt.TypeOf<typeof PushCaseParamsRt>;
export type PushCaseResponse = rt.TypeOf<typeof PushCaseResponseRt>;
export type CasePushedData = rt.TypeOf<typeof CasePushedBasicRt>;
export type PushCommentParams = rt.TypeOf<typeof PushCommentParamsRt>;
