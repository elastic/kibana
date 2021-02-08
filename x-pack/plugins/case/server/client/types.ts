/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract, RequestHandlerContext } from 'kibana/server';
import { ActionsClient } from '../../../actions/server';
import {
  CasePostRequest,
  CaseResponse,
  CasesPatchRequest,
  CasesResponse,
  CaseStatuses,
  CommentRequest,
  ConnectorMappingsAttributes,
  GetFieldsResponse,
} from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';
import { ConnectorMappingsServiceSetup } from '../services/connector_mappings';
export interface CaseClientCreate {
  theCase: CasePostRequest;
}

export interface CaseClientUpdate {
  caseClient: CaseClient;
  cases: CasesPatchRequest;
}

export interface CaseClientAddComment {
  caseClient: CaseClient;
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientUpdateAlertsStatus {
  ids: string[];
  status: CaseStatuses;
}

type PartialExceptFor<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
  context?: PartialExceptFor<RequestHandlerContext, 'core'>;
}

export interface ConfigureFields {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}
export interface CaseClient {
  addComment: (args: CaseClientAddComment) => Promise<CaseResponse>;
  create: (args: CaseClientCreate) => Promise<CaseResponse>;
  getFields: (args: ConfigureFields) => Promise<GetFieldsResponse>;
  getMappings: (args: MappingsClient) => Promise<ConnectorMappingsAttributes[]>;
  update: (args: CaseClientUpdate) => Promise<CasesResponse>;
  updateAlertsStatus: (args: CaseClientUpdateAlertsStatus) => Promise<void>;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  caseClient: CaseClient;
  connectorId: string;
  connectorType: string;
}
