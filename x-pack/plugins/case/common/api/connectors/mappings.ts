/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  ServiceNowITSMIncident,
} from '../../../../actions/server/builtin_action_types/servicenow/types';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowFieldsRT } from './servicenow';
import { JiraFieldsRT } from './jira';

// Formerly imported from security_solution
export interface ElasticUser {
  readonly email?: string | null;
  readonly fullName?: string | null;
  readonly username?: string | null;
}

export {
  JiraPushToServiceApiParams,
  ResilientPushToServiceApiParams,
  ServiceNowITSMPushToServiceApiParams,
};
export type Incident = JiraIncident | ResilientIncident | ServiceNowITSMIncident;
export type PushToServiceApiParams =
  | JiraPushToServiceApiParams
  | ResilientPushToServiceApiParams
  | ServiceNowITSMPushToServiceApiParams;

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

export interface PipedField {
  actionType: string;
  key: string;
  pipes: string[];
  value: string;
}
export interface PrepareFieldsForTransformArgs {
  defaultPipes: string[];
  mappings: ConnectorMappingsAttributes[];
  params: ServiceConnectorCaseParams;
}
export interface EntityInformation {
  createdAt: string;
  createdBy: ElasticUser;
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
  ...ServiceNowFieldsRT.props,
});

export const ServiceConnectorCaseParamsRt = rt.intersection([
  ServiceConnectorBasicCaseParamsRt,
  ConnectorPartialFieldsRt,
]);

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
export type ServiceConnectorBasicCaseParams = rt.TypeOf<typeof ServiceConnectorBasicCaseParamsRt>;
export type ServiceConnectorCaseParams = rt.TypeOf<typeof ServiceConnectorCaseParamsRt>;
export type ServiceConnectorCaseResponse = rt.TypeOf<typeof ServiceConnectorCaseResponseRt>;
export type ServiceConnectorCommentParams = rt.TypeOf<typeof ServiceConnectorCommentParamsRt>;

export const PostPushRequestRt = rt.type({
  connector_type: rt.string,
  params: ServiceConnectorCaseParamsRt,
});

export type PostPushRequest = rt.TypeOf<typeof PostPushRequestRt>;

export interface SimpleComment {
  comment: string;
  commentId: string;
}

export interface MapIncident {
  incident: ExternalServiceParams;
  comments: SimpleComment[];
}
