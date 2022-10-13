/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PushToServiceApiParams as JiraPushToServiceApiParams,
  Incident as JiraIncident,
} from '@kbn/stack-connectors-plugin/server/connector_types/cases/jira/types';
import {
  PushToServiceApiParams as ResilientPushToServiceApiParams,
  Incident as ResilientIncident,
} from '@kbn/stack-connectors-plugin/server/connector_types/cases/resilient/types';
import {
  PushToServiceApiParamsITSM as ServiceNowITSMPushToServiceApiParams,
  PushToServiceApiParamsSIR as ServiceNowSIRPushToServiceApiParams,
  ServiceNowITSMIncident,
} from '@kbn/stack-connectors-plugin/server/connector_types/lib/servicenow/types';
import { UserProfile } from '@kbn/security-plugin/common';
import { CaseResponse, ConnectorMappingsAttributes } from '../../../common/api';

export type Incident = JiraIncident | ResilientIncident | ServiceNowITSMIncident;
export type PushToServiceApiParams =
  | JiraPushToServiceApiParams
  | ResilientPushToServiceApiParams
  | ServiceNowITSMPushToServiceApiParams
  | ServiceNowSIRPushToServiceApiParams;

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
  userProfiles?: Map<string, UserProfile>;
}

export interface ExternalServiceComment {
  comment: string;
  commentId: string;
}

export interface MapIncident {
  incident: ExternalServiceParams;
  comments: ExternalServiceComment[];
}
