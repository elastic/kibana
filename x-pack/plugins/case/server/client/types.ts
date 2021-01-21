/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { ActionsClient } from '../../../actions/server';
import {
  CaseClientPostRequest,
  CaseConvertRequest,
  CaseResponse,
  CasesPatchRequest,
  CasesResponse,
  CaseStatuses,
  CombinedCaseResponse,
  CommentRequest,
  ConnectorMappingsAttributes,
  GetFieldsResponse,
  InternalCommentRequest,
  SubCaseResponse,
} from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';
import { ConnectorMappingsServiceSetup } from '../services/connector_mappings';

// TODO: Remove unused types
export interface CaseClientCreate {
  theCase: CaseClientPostRequest;
}

export interface CaseClientUpdate {
  cases: CasesPatchRequest;
}

export interface CaseClientAddComment {
  caseClient: CaseClient;
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientAddInternalComment {
  caseId: string;
  comment: InternalCommentRequest;
}

export interface CaseClientUpdateAlertsStatus {
  ids: string[];
  status: CaseStatuses;
  indices: Set<string>;
}

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
}

export interface ConfigureFields {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}
export interface CaseClient {
  addComment: (caseId: string, comment: CommentRequest) => Promise<CombinedCaseResponse>;
  addCommentFromRule: (
    caseId: string,
    comment: InternalCommentRequest
  ) => Promise<CombinedCaseResponse>;
  create(theCase: CaseClientPostRequest): Promise<CaseResponse>;
  convertCaseToCollection(caseInfo: CaseConvertRequest): Promise<CasesResponse>;
  getFields(args: ConfigureFields): Promise<GetFieldsResponse>;
  getMappings(args: MappingsClient): Promise<ConnectorMappingsAttributes[]>;
  update(cases: CasesPatchRequest): Promise<CasesResponse>;
  updateAlertsStatus(args: CaseClientUpdateAlertsStatus): Promise<void>;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  caseClient: CaseClient;
  connectorId: string;
  connectorType: string;
}
