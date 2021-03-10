/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
import { ActionsClient } from 'x-pack/plugins/actions/server';
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
} from '../../common/api';
import { AlertInfo } from '../common';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';
import { ConnectorMappingsServiceSetup } from '../services/connector_mappings';
import { CaseClientGetAlertsResponse } from './alerts/types';

export interface CaseClientGet {
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

export interface CaseClientPush {
  actionsClient: ActionsClient;
  caseId: string;
  connectorId: string;
}

export interface CaseClientAddComment {
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientUpdateAlertsStatus {
  alerts: UpdateAlertRequest[];
}

export interface CaseClientGetAlerts {
  alertsInfo: AlertInfo[];
}

export interface CaseClientGetUserActions {
  caseId: string;
  subCaseId?: string;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}

export interface CaseClientFactoryArguments {
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
export interface CaseClient {
  addComment(args: CaseClientAddComment): Promise<CaseResponse>;
  create(theCase: CasePostRequest): Promise<CaseResponse>;
  get(args: CaseClientGet): Promise<CaseResponse>;
  getAlerts(args: CaseClientGetAlerts): Promise<CaseClientGetAlertsResponse>;
  getFields(args: ConfigureFields): Promise<GetFieldsResponse>;
  getMappings(args: MappingsClient): Promise<ConnectorMappingsAttributes[]>;
  getUserActions(args: CaseClientGetUserActions): Promise<CaseUserActionsResponse>;
  push(args: CaseClientPush): Promise<CaseResponse>;
  update(args: CasesPatchRequest): Promise<CasesResponse>;
  updateAlertsStatus(args: CaseClientUpdateAlertsStatus): Promise<void>;
}

export interface MappingsClient {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}
