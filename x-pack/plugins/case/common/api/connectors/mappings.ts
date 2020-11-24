/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import * as rt from 'io-ts';
import { ElasticUser } from '../../../../security_solution/public/cases/containers/types';
import {
  PushToServiceApiParams as JiraPushToServiceApiParams,
  Incident as JiraIncident,
} from '../../../../actions/server/builtin_action_types/jira/types';
import {
  PushToServiceApiParams as ResilientPushToServiceApiParams,
  Incident as ResilientIncident,
} from '../../../../actions/server/builtin_action_types/resilient/types';
import {
  PushToServiceApiParams as ServiceNowPushToServiceApiParams,
  Incident as ServiceNowIncident,
} from '../../../../actions/server/builtin_action_types/servicenow/types';

export {
  JiraPushToServiceApiParams,
  ResilientPushToServiceApiParams,
  ServiceNowPushToServiceApiParams,
};
export type Incident = JiraIncident | ResilientIncident | ServiceNowIncident;
export type PushToServiceApiParams =
  | JiraPushToServiceApiParams
  | ResilientPushToServiceApiParams
  | ServiceNowPushToServiceApiParams;

const ActionTypeRT = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);
const CaseFieldRT = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('comments'),
]);
const ThirdPartyFieldRT = rt.union([rt.string, rt.literal('not_mapped')]);
export type ActionType = rt.TypeOf<typeof ActionTypeRT>;
export type CaseField = rt.TypeOf<typeof CaseFieldRT>;
export type ThirdPartyField = rt.TypeOf<typeof ThirdPartyFieldRT>;

export const ConnectorMappingsAttributesRT = rt.type({
  action_type: ActionTypeRT,
  source: CaseFieldRT,
  target: ThirdPartyFieldRT,
});
export const ConnectorMappingsRt = rt.type({
  mappings: rt.array(ConnectorMappingsAttributesRT),
});
export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRT>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;

const FieldTypeRT = rt.union([rt.literal('text'), rt.literal('textarea')]);

const ConnectorFieldRt = rt.type({
  id: rt.string,
  name: rt.string,
  required: rt.boolean,
  type: FieldTypeRT,
});
export type ConnectorField = rt.TypeOf<typeof ConnectorFieldRt>;
export const ConnectorRequestParamsRt = rt.type({
  connector_id: rt.string,
});
export const GetFieldsRequestQueryRt = rt.type({
  connector_type: rt.string,
});
const GetFieldsResponseRt = rt.type({
  defaultMappings: rt.array(ConnectorMappingsAttributesRT),
  fields: rt.array(ConnectorFieldRt),
});
export type GetFieldsResponse = rt.TypeOf<typeof GetFieldsResponseRt>;

///////////////////////////////////////////////////////////////////////

export type ExternalServiceParams = Record<string, unknown>;
export type ExternalServiceStringParams = Record<string, string>;

export interface PipedField {
  actionType: string;
  key: string;
  pipes: string[];
  value: string;
}
export interface PrepareFieldsForTransformArgs {
  defaultPipes: string[];
  // params: PushToServiceApiParams;
  params: Record<string, string>;
  mappings: ConnectorMappingsAttributes[];
}
export interface EntityInformation {
  createdAt: string | null;
  createdBy: ElasticUser | null;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
}
export interface TransformerArgs {
  date?: string;
  previousValue?: string;
  user?: string;
  value: string;
}

export type Transformer = (args: TransformerArgs) => TransformerArgs;
export interface TransformFieldsArgs<P, S> {
  currentIncident?: S;
  fields: PipedField[];
  params: P;
}
export const ConnectorUserParams = rt.type({
  fullName: rt.union([rt.string, rt.null]),
  username: rt.string,
});

export const ConnectorCommentParamsRt = rt.type({
  commentId: rt.string,
  comment: rt.string,
  createdAt: rt.string,
  createdBy: ConnectorUserParams,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([ConnectorUserParams, rt.null]),
});

export const ConnectorBasicCaseParamsRt = rt.type({
  comments: rt.union([rt.array(ConnectorCommentParamsRt), rt.null]),
  createdAt: rt.string,
  createdBy: ConnectorUserParams,
  description: rt.union([rt.string, rt.null]),
  externalId: rt.union([rt.string, rt.null]),
  savedObjectId: rt.string,
  title: rt.string,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([ConnectorUserParams, rt.null]),
  // third party fields
  incidentTypes: rt.union([rt.array(rt.number), rt.null, rt.undefined]),
  severityCode: rt.union([rt.number, rt.null, rt.undefined]),
  severity: rt.union([rt.string, rt.null, rt.undefined]),
  urgency: rt.union([rt.string, rt.null, rt.undefined]),
  impact: rt.union([rt.string, rt.null, rt.undefined]),
  issueType: rt.union([rt.string, rt.null, rt.undefined]),
  priority: rt.union([rt.string, rt.null, rt.undefined]),
  labels: rt.union([rt.array(rt.string), rt.null, rt.undefined]),
  parent: rt.union([rt.string, rt.null, rt.undefined]),
});
export type ConnectorBasicCaseParams = rt.TypeOf<typeof ConnectorBasicCaseParamsRt>;
export const PostPushRequestRt = rt.type({
  connector_type: rt.string,
  params: ConnectorBasicCaseParamsRt,
});

export interface SimpleComment {
  comment: string;
  commentId: string;
}

export interface MapIncident {
  incident: ExternalServiceParams;
  comments: SimpleComment[];
}
