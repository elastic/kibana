/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract, RequestHandlerContext } from 'kibana/server';
import {
  CasePostRequest,
  CasesPatchRequest,
  CommentRequest,
  CaseResponse,
  CasesResponse,
  CaseStatuses,
} from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';

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
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
  context?: PartialExceptFor<RequestHandlerContext, 'core'>;
}

export interface CaseClient {
  create: (args: CaseClientCreate) => Promise<CaseResponse>;
  update: (args: CaseClientUpdate) => Promise<CasesResponse>;
  addComment: (args: CaseClientAddComment) => Promise<CaseResponse>;
  updateAlertsStatus: (args: CaseClientUpdateAlertsStatus) => Promise<void>;
}
