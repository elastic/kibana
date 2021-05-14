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
  /**
   * The description of the case
   */
  description: rt.string,
  /**
   * The current status of the case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * The identifying strings for filter a case
   */
  tags: rt.array(rt.string),
  /**
   * The title of a case
   */
  title: rt.string,
  /**
   * The type of a case (individual or collection)
   */
  [caseTypeField]: CaseTypeRt,
  /**
   * The external system that the case can be synced with
   */
  connector: CaseConnectorRt,
  /**
   * The alert sync settings
   */
  settings: SettingsRt,
  /**
   * The plugin owner of the case
   */
  owner: rt.string,
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
  /**
   * Description of the case
   */
  description: rt.string,
  /**
   * Identifiers for the case.
   */
  tags: rt.array(rt.string),
  /**
   * Title of the case
   */
  title: rt.string,
  /**
   * The external configuration for the case
   */
  connector: CaseConnectorRt,
  /**
   * Sync settings for alerts
   */
  settings: SettingsRt,
  /**
   * The owner here must match the string used when a plugin registers a feature with access to the cases plugin. The user
   * creating this case must also be granted access to that plugin's feature.
   */
  owner: rt.string,
});

/**
 * This type is used for validating a create case request. It requires that the type field be defined.
 */
export const CasesClientPostRequestRt = rt.type({
  ...CasePostRequestNoTypeRt.props,
  [caseTypeField]: CaseTypeRt,
});

/**
 * This type is not used for validation when decoding a request because intersection does not have props defined which
 * required for the excess function. Instead we use this as the type used by the UI. This allows the type field to be
 * optional and the server will handle setting it to a default value before validating that the request
 * has all the necessary fields. CasesClientPostRequestRt is used for validation.
 */
export const CasePostRequestRt = rt.intersection([
  /**
   * The case type: an individual case (one without children) or a collection case (one with children)
   */
  rt.partial({ [caseTypeField]: CaseTypeRt }),
  CasePostRequestNoTypeRt,
]);

export const CasesFindRequestRt = rt.partial({
  /**
   * Type of a case (individual, or collection)
   */
  type: CaseTypeRt,
  /**
   * Tags to filter by
   */
  tags: rt.union([rt.array(rt.string), rt.string]),
  /**
   * The status of the case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * The reporters to filter by
   */
  reporters: rt.union([rt.array(rt.string), rt.string]),
  /**
   * Operator to use for the `search` field
   */
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  /**
   * The fields in the entity to return in the response
   */
  fields: rt.array(rt.string),
  /**
   * The page of objects to return
   */
  page: NumberFromString,
  /**
   * The number of objects to include in each page
   */
  perPage: NumberFromString,
  /**
   * An Elasticsearch simple_query_string
   */
  search: rt.string,
  /**
   * The fields to perform the simple_query_string parsed query against
   */
  searchFields: rt.union([rt.array(rt.string), rt.string]),
  /**
   * The field to use for sorting the found objects.
   *
   * This only supports, `create_at`, `closed_at`, and `status`
   */
  sortField: rt.string,
  /**
   * The order to sort by
   */
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
  /**
   * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
   * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
   * that the user has access to.
   */
  owner: rt.union([rt.array(rt.string), rt.string]),
});

export const CasesByAlertIDRequestRt = rt.partial({
  /**
   * The type of cases to retrieve given an alert ID. If no owner is provided, all cases
   * that the user has access to will be returned.
   */
  owner: rt.union([rt.array(rt.string), rt.string]),
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
  /**
   * The saved object ID and version
   */
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

export const AllTagsFindRequestRt = rt.partial({
  /**
   * The owner of the cases to retrieve the tags from. If no owner is provided the tags from all cases
   * that the user has access to will be returned.
   */
  owner: rt.union([rt.array(rt.string), rt.string]),
});

export const AllReportersFindRequestRt = AllTagsFindRequestRt;

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
/**
 * This field differs from the CasePostRequest in that the post request's type field can be optional. This type requires
 * that the type field be defined. The CasePostRequest should be used in most places (the UI etc). This type is really
 * only necessary for validation.
 */
export type CasesClientPostRequest = rt.TypeOf<typeof CasesClientPostRequestRt>;
export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type CaseResponse = rt.TypeOf<typeof CaseResponseRt>;
export type CasesResponse = rt.TypeOf<typeof CasesResponseRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesByAlertIDRequest = rt.TypeOf<typeof CasesByAlertIDRequestRt>;
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

export type AllTagsFindRequest = rt.TypeOf<typeof AllTagsFindRequestRt>;
export type AllReportersFindRequest = AllTagsFindRequest;
