/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import * as rt from 'io-ts';
import {
  PushToServiceApiParams as JiraPushToServiceApiParams,
  Incident as JiraIncident,
} from '../../../../actions/server/builtin_action_types/jira/types';
import {
  PushToServiceApiParams as ResilientPushToServiceApiParams,
  Incident as ResilientIncident,
} from '../../../../actions/server/builtin_action_types/resilient/types';
import {
  PushToServiceApiParamsITSM as ServiceNowITSMPushToServiceApiParams,
  PushToServiceApiParamsSIR as ServiceNowSIRPushToServiceApiParams,
  ServiceNowITSMIncident,
} from '../../../../actions/server/builtin_action_types/servicenow/types';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowITSMFieldsRT } from './servicenow_itsm';
import { JiraFieldsRT } from './jira';
import { ServiceNowSIRFieldsRT } from './servicenow_sir';
import { CaseResponse } from '../cases';

export {
  JiraPushToServiceApiParams,
  ResilientPushToServiceApiParams,
  ServiceNowITSMPushToServiceApiParams,
  ServiceNowSIRPushToServiceApiParams,
};
export type Incident = JiraIncident | ResilientIncident | ServiceNowITSMIncident;
export type PushToServiceApiParams =
  | JiraPushToServiceApiParams
  | ResilientPushToServiceApiParams
  | ServiceNowITSMPushToServiceApiParams
  | ServiceNowSIRPushToServiceApiParams;

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

export type ExternalServiceParams = Record<string, unknown>;

export interface BasicParams {
  title: CaseResponse['title'];
  description: CaseResponse['description'];
  createdAt: CaseResponse['created_at'];
  createdBy: CaseResponse['created_by'];
  updatedAt: CaseResponse['updated_at'];
  updatedBy: CaseResponse['updated_by'];
}

export interface PipedField {
  actionType: string;
  key: string;
  pipes: string[];
  value: string;
}
export interface PrepareFieldsForTransformArgs {
  defaultPipes: string[];
  mappings: ConnectorMappingsAttributes[];
  params: { title: string; description: string };
}
export interface EntityInformation {
  createdAt: CaseResponse['created_at'];
  createdBy: CaseResponse['created_by'];
  updatedAt: CaseResponse['updated_at'];
  updatedBy: CaseResponse['updated_by'];
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

export const ServiceConnectorUserParams = rt.type({
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
export const ServiceConnectorBasicCaseParamsRt = rt.type({
  comments: rt.union([rt.array(ServiceConnectorCommentParamsRt), rt.null]),
  createdAt: rt.string,
  createdBy: ServiceConnectorUserParams,
  description: rt.union([rt.string, rt.null]),
  externalId: rt.union([rt.string, rt.null]),
  savedObjectId: rt.string,
  title: rt.string,
  updatedAt: rt.union([rt.string, rt.null]),
  updatedBy: rt.union([ServiceConnectorUserParams, rt.null]),
});

export const ConnectorPartialFieldsRt = rt.partial({
  ...JiraFieldsRT.props,
  ...ResilientFieldsRT.props,
  ...ServiceNowITSMFieldsRT.props,
  ...ServiceNowSIRFieldsRT.props,
});

export const ServiceConnectorCaseParamsRt = rt.intersection([
  ServiceConnectorBasicCaseParamsRt,
  ConnectorPartialFieldsRt,
]);

export type ServiceConnectorBasicCaseParams = rt.TypeOf<typeof ServiceConnectorBasicCaseParamsRt>;
export type ServiceConnectorCaseParams = rt.TypeOf<typeof ServiceConnectorCaseParamsRt>;
export type ServiceConnectorCommentParams = rt.TypeOf<typeof ServiceConnectorCommentParamsRt>;

export const PostPushRequestRt = rt.type({
  case_id: rt.string,
});

export type PostPushRequest = rt.TypeOf<typeof PostPushRequestRt>;

export interface ExternalServiceComment {
  comment: string;
  commentId: string;
}

export interface MapIncident {
  incident: ExternalServiceParams;
  comments: ExternalServiceComment[];
}
