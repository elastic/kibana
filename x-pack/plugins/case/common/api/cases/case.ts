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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { ActionTypeExecutorResult } from '../../../../actions/server/types';

const StatusRt = rt.union([rt.literal('open'), rt.literal('closed')]);

const CaseBasicRt = rt.type({
  connector_id: rt.string,
  description: rt.string,
  status: StatusRt,
  tags: rt.array(rt.string),
  title: rt.string,
});

const CaseExternalServiceBasicRt = rt.type({
  connector_id: rt.string,
  connector_name: rt.string,
  external_id: rt.string,
  external_title: rt.string,
  external_url: rt.string,
});

const CaseFullExternalServiceRt = rt.union([
  rt.intersection([
    CaseExternalServiceBasicRt,
    rt.type({
      pushed_at: rt.string,
      pushed_by: UserRT,
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
    external_service: CaseFullExternalServiceRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
  }),
]);

export const CasePostRequestRt = rt.type({
  description: rt.string,
  tags: rt.array(rt.string),
  title: rt.string,
});

export const CaseExternalServiceRequestRt = CaseExternalServiceBasicRt;

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
  rt.partial(CaseBasicRt.props),
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

const ServiceConnectorUserParams = rt.type({
  fullName: rt.union([rt.string, rt.null]),
  username: rt.string,
});

export const ServiceConnectorCommentParamsRt = rt.type({
  commentId: rt.string,
  comment: rt.string,
  createdAt: rt.string,
  createdBy: ServiceConnectorUserParams,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([ServiceConnectorUserParams, rt.null]),
});

export const ServiceConnectorCaseParamsRt = rt.type({
  savedObjectId: rt.string,
  createdAt: rt.string,
  createdBy: ServiceConnectorUserParams,
  externalId: rt.union([rt.string, rt.null]),
  title: rt.string,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([ServiceConnectorUserParams, rt.null]),
  description: rt.union([rt.string, rt.null]),
  comments: rt.union([rt.array(ServiceConnectorCommentParamsRt), rt.null]),
});

export const ServiceConnectorCaseResponseRt = rt.intersection([
  rt.type({
    title: rt.string,
    id: rt.string,
    pushedDate: rt.string,
    url: rt.string,
  }),
  rt.partial({
    comments: rt.array(
      rt.intersection([
        rt.type({
          commentId: rt.string,
          pushedDate: rt.string,
        }),
        rt.partial({ externalCommentId: rt.string }),
      ])
    ),
  }),
]);

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type Status = rt.TypeOf<typeof StatusRt>;
export type CaseExternalServiceRequest = rt.TypeOf<typeof CaseExternalServiceRequestRt>;
export type ServiceConnectorCaseParams = rt.TypeOf<typeof ServiceConnectorCaseParamsRt>;
export type ServiceConnectorCaseResponse = rt.TypeOf<typeof ServiceConnectorCaseResponseRt>;
export type CaseFullExternalService = rt.TypeOf<typeof CaseFullExternalServiceRt>;
export type ServiceConnectorCommentParams = rt.TypeOf<typeof ServiceConnectorCommentParamsRt>;
