/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { NumberFromString } from '../saved_object';
import { UserRt } from '../user';
import { CommentRt } from './comment';
import { CasesStatusResponseRt, CaseStatusRt } from './status';
import { CaseConnectorRt } from '../connectors/connector';
import { CaseAssigneesRt } from './assignee';

export const AttachmentTotalsRt = rt.type({
  alerts: rt.number,
  userComments: rt.number,
});

export const RelatedCaseInfoRt = rt.type({
  id: rt.string,
  title: rt.string,
  description: rt.string,
  status: CaseStatusRt,
  createdAt: rt.string,
  totals: AttachmentTotalsRt,
});

export const CasesByAlertIdRt = rt.array(RelatedCaseInfoRt);

export const SettingsRt = rt.type({
  syncAlerts: rt.boolean,
});

export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const CaseSeverityRt = rt.union([
  rt.literal(CaseSeverity.LOW),
  rt.literal(CaseSeverity.MEDIUM),
  rt.literal(CaseSeverity.HIGH),
  rt.literal(CaseSeverity.CRITICAL),
]);

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
  /**
   * The severity of the case
   */
  severity: CaseSeverityRt,
  /**
   * The users assigned to this case
   */
  assignees: CaseAssigneesRt,
});

/**
 * This represents the push to service UserAction. It lacks the connector_id because that is stored in a different field
 * within the user action object in the API response.
 */
export const CaseUserActionExternalServiceRt = rt.type({
  connector_name: rt.string,
  external_id: rt.string,
  external_title: rt.string,
  external_url: rt.string,
  pushed_at: rt.string,
  pushed_by: UserRt,
});

export const CaseExternalServiceBasicRt = rt.intersection([
  rt.type({
    connector_id: rt.string,
  }),
  CaseUserActionExternalServiceRt,
]);

export const CaseFullExternalServiceRt = rt.union([CaseExternalServiceBasicRt, rt.null]);

export const CaseAttributesRt = rt.intersection([
  CaseBasicRt,
  rt.type({
    duration: rt.union([rt.number, rt.null]),
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRt, rt.null]),
    created_at: rt.string,
    created_by: UserRt,
    external_service: CaseFullExternalServiceRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRt, rt.null]),
  }),
]);

export const CasePostRequestRt = rt.intersection([
  rt.type({
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
  }),
  rt.partial({
    /**
     * The users assigned to the case
     */
    assignees: CaseAssigneesRt,
    /**
     * The severity of the case. The severity is
     * default it to "low" if not provided.
     */
    severity: CaseSeverityRt,
  }),
]);

const CasesFindRequestSearchFieldsRt = rt.keyof({
  'closed_by.username': null,
  'closed_by.full_name': null,
  'closed_by.email': null,
  'closed_by.profile_uid': null,
  'created_by.username': null,
  'created_by.full_name': null,
  'created_by.email': null,
  'created_by.profile_uid': null,
  description: null,
  'connector.name': null,
  'connector.type': null,
  'external_service.pushed_by.username': null,
  'external_service.pushed_by.full_name': null,
  'external_service.pushed_by.email': null,
  'external_service.pushed_by.profile_uid': null,
  'external_service.connector_name': null,
  'external_service.external_id': null,
  'external_service.external_title': null,
  'external_service.external_url': null,
  title: null,
  'title.keyword': null,
  'updated_by.username': null,
  'updated_by.full_name': null,
  'updated_by.email': null,
  'updated_by.profile_uid': null,
});

export const CasesFindRequestRt = rt.partial({
  /**
   * Tags to filter by
   */
  tags: rt.union([rt.array(rt.string), rt.string]),
  /**
   * The status of the case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * The severity of the case
   */
  severity: CaseSeverityRt,
  /**
   * The uids of the user profiles to filter by
   */
  assignees: rt.union([rt.array(rt.string), rt.string]),
  /**
   * The reporters to filter by
   */
  reporters: rt.union([rt.array(rt.string), rt.string]),
  /**
   * Operator to use for the `search` field
   */
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  /**
   * A KQL date. If used all cases created after (gte) the from date will be returned
   */
  from: rt.string,
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
  searchFields: rt.union([
    rt.array(CasesFindRequestSearchFieldsRt),
    CasesFindRequestSearchFieldsRt,
  ]),
  /**
   * The root fields to perform the simple_query_string parsed query against
   */
  rootSearchFields: rt.array(rt.string),
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
   * A KQL date. If used all cases created before (lte) the to date will be returned.
   */
  to: rt.string,
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

export const CaseRt = rt.intersection([
  CaseAttributesRt,
  rt.type({
    id: rt.string,
    totalComment: rt.number,
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.partial({
    comments: rt.array(CommentRt),
  }),
]);

export const CaseResolveResponseRt = rt.intersection([
  rt.type({
    case: CaseRt,
    outcome: rt.union([rt.literal('exactMatch'), rt.literal('aliasMatch'), rt.literal('conflict')]),
  }),
  rt.partial({
    alias_target_id: rt.string,
    alias_purpose: rt.union([rt.literal('savedObjectConversion'), rt.literal('savedObjectImport')]),
  }),
]);

export const CasesFindResponseRt = rt.intersection([
  rt.type({
    cases: rt.array(CaseRt),
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
export const CasesRt = rt.array(CaseRt);

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

export const CasesBulkGetRequestRt = rt.type({
  ids: rt.array(rt.string),
});

export const CasesBulkGetResponseRt = rt.type({
  cases: CasesRt,
  errors: rt.array(
    rt.type({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      caseId: rt.string,
    })
  ),
});

export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;

export type CasePostRequest = rt.TypeOf<typeof CasePostRequestRt>;
export type Case = rt.TypeOf<typeof CaseRt>;
export type CaseResolveResponse = rt.TypeOf<typeof CaseResolveResponseRt>;
export type Cases = rt.TypeOf<typeof CasesRt>;
export type CasesFindRequest = rt.TypeOf<typeof CasesFindRequestRt>;
export type CasesByAlertIDRequest = rt.TypeOf<typeof CasesByAlertIDRequestRt>;
export type CasesFindResponse = rt.TypeOf<typeof CasesFindResponseRt>;
export type CasePatchRequest = rt.TypeOf<typeof CasePatchRequestRt>;
export type CasesPatchRequest = rt.TypeOf<typeof CasesPatchRequestRt>;
export type CaseFullExternalService = rt.TypeOf<typeof CaseFullExternalServiceRt>;
export type CaseSettings = rt.TypeOf<typeof SettingsRt>;
export type ExternalServiceResponse = rt.TypeOf<typeof ExternalServiceResponseRt>;
export type CaseExternalServiceBasic = rt.TypeOf<typeof CaseExternalServiceBasicRt>;

export type AllTagsFindRequest = rt.TypeOf<typeof AllTagsFindRequestRt>;
export type AllReportersFindRequest = AllTagsFindRequest;

export type AttachmentTotals = rt.TypeOf<typeof AttachmentTotalsRt>;
export type RelatedCaseInfo = rt.TypeOf<typeof RelatedCaseInfoRt>;
export type CasesByAlertId = rt.TypeOf<typeof CasesByAlertIdRt>;

export type CasesBulkGetRequest = rt.TypeOf<typeof CasesBulkGetRequestRt>;
export type CasesBulkGetResponse = rt.TypeOf<typeof CasesBulkGetResponseRt>;
