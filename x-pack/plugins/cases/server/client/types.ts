/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
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
  CaseUserActionsResponse,
  User,
} from '../../common';
import { AlertInfo } from '../common';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';
import { ConnectorMappingsServiceSetup } from '../services/connector_mappings';
import { CasesClientGetAlertsResponse } from './alerts/types';

export interface CasesClientGet {
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

export interface CasesClientPush {
  actionsClient: ActionsClient;
  caseId: string;
  connectorId: string;
}

export interface CasesClientAddComment {
  caseId: string;
  comment: CommentRequest;
}

export interface CasesClientUpdateAlertsStatus {
  alerts: UpdateAlertRequest[];
}

export interface CasesClientGetAlerts {
  alertsInfo: AlertInfo[];
}

export interface CasesClientGetUserActions {
  caseId: string;
  subCaseId?: string;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}

export interface CasesClientFactoryArguments {
  scopedClusterClient: ElasticsearchClient;
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  user: User;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
  logger: Logger;
}

export interface ConfigureFields {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}

/**
 * Defines the fields necessary to update an alert's status.
 */
export interface UpdateAlertRequest {
  id: string;
  index: string;
  status: CaseStatuses;
}

/**
 * This represents the interface that other plugins can access.
 */
export interface CasesClient {
  addComment(args: CasesClientAddComment): Promise<CaseResponse>;
  create(theCase: CasePostRequest): Promise<CaseResponse>;
  get(args: CasesClientGet): Promise<CaseResponse>;
  getAlerts(args: CasesClientGetAlerts): Promise<CasesClientGetAlertsResponse>;
  getFields(args: ConfigureFields): Promise<GetFieldsResponse>;
  getMappings(args: MappingsClient): Promise<ConnectorMappingsAttributes[]>;
  getUserActions(args: CasesClientGetUserActions): Promise<CaseUserActionsResponse>;
  push(args: CasesClientPush): Promise<CaseResponse>;
  update(args: CasesPatchRequest): Promise<CasesResponse>;
  updateAlertsStatus(args: CasesClientUpdateAlertsStatus): Promise<void>;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}
