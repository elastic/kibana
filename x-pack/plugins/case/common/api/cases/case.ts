/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { NumberFromString } from '../saved_object';
import { UserRT } from '../user';
import { CommentResponseRt } from './comment';
import { CasesStatusResponseRt, CaseStatusRt } from './status';
import { CaseConnectorRt, ESCaseConnector } from '../connectors';
import { SubCaseResponseRt } from './sub_case';

export enum CaseType {
  collection = 'collection',
  individual = 'individual',
}

/**
 * Exposing the field used to define the case type so that it can be used for filtering in saved object find queries.
 */
export const caseTypeField = 'type';

const CaseTypeRt = rt.union([rt.literal(CaseType.collection), rt.literal(CaseType.individual)]);

const SettingsRt = rt.type({
  syncAlerts: rt.boolean,
});

const CaseBasicRt = rt.type({
  description: rt.string,
  status: CaseStatusRt,
  tags: rt.array(rt.string),
  title: rt.string,
  [caseTypeField]: CaseTypeRt,
  connector: CaseConnectorRt,
  settings: SettingsRt,
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

const CasePostRequestNoTypeRt = rt.type({
  description: rt.string,
  tags: rt.array(rt.string),
  title: rt.string,
  connector: CaseConnectorRt,
  settings: SettingsRt,
});

/**
 * This type is used for validating a create case request. It requires that the type field be defined.
 */
export const CaseClientPostRequestRt = rt.type({
  ...CasePostRequestNoTypeRt.props,
  [caseTypeField]: CaseTypeRt,
});

/**
 * This type is not used for validation when decoding a request because intersection does not have props defined which
 * required for the excess function. Instead we use this as the type used by the UI. This allows the type field to be
 * optional and the server will handle setting it to a default value before validating that the request
 * has all the necessary fields. CaseClientPostRequestRt is used for validation.
 */
export const CasePostRequestRt = rt.intersection([
  rt.partial({ type: CaseTypeRt }),
  CasePostRequestNoTypeRt,
]);

export const CasesFindRequestRt = rt.partial({
  type: CaseTypeRt,
  tags: rt.union([rt.array(rt.string), rt.string]),
  status: CaseStatusRt,
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
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.partial({
    subCaseIds: rt.array(rt.string),
    subCases: rt.array(SubCaseResponseRt),
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

export const CasePushRequestParamsRt = rt.type({
  case_id: rt.string,
  connector_id: rt.string,
});

export const ExternalServiceResponseRt = rt.intersection([
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
/**
 * This field differs from the CasePostRequest in that the post request's type field can be optional. This type requires
 * that the type field be defined. The CasePostRequest should be used in most places (the UI etc). This type is really
 * only necessary for validation.
 */
export type CaseClientPostRequest = rt.TypeOf<typeof CaseClientPostRequestRt>;
export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type CaseFullExternalService = rt.TypeOf<typeof CaseFullExternalServiceRt>;
export type CaseSettings = rt.TypeOf<typeof SettingsRt>;
export type ExternalServiceResponse = rt.TypeOf<typeof ExternalServiceResponseRt>;

export type ESCaseAttributes = Omit<CaseAttributes, 'connector'> & { connector: ESCaseConnector };
export type ESCasePatchRequest = Omit<CasePatchRequest, 'connector'> & {
  connector?: ESCaseConnector;
};
