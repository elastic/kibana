/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../src/core/server';
import { ActionsClient } from '../../../actions/server';
import {
  CasePostRequest,
  CasesPatchRequest,
  CommentRequest,
  CaseResponse,
  CasesResponse,
  Field,
} from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../services';
import { ConnectorMappingsServiceSetup } from '../services/connector_mappings';
export interface CaseClientCreate {
  theCase: CasePostRequest;
}

export interface CaseClientUpdate {
  cases: CasesPatchRequest;
}

export interface CaseClientAddComment {
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
}

export interface ConfigureFields {
  actionsClient: ActionsClient;
  connectorId: string;
  connectorType: string;
}
export interface CaseClient {
  addComment: (args: CaseClientAddComment) => Promise<CaseResponse>;
  create: (args: CaseClientCreate) => Promise<CaseResponse>;
  update: (args: CaseClientUpdate) => Promise<CasesResponse>;
  getFields: (args: ConfigureFields) => Promise<Field[]>;
}
