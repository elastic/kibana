/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../src/core/server';
import {
  CasePostRequest,
  CasesPatchRequest,
  CommentRequest,
  CaseResponse,
  CasesResponse,
} from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../services';

export interface CaseClientFunctionArguments {
  request: KibanaRequest;
}

export interface CaseClientCreate extends CaseClientFunctionArguments {
  theCase: CasePostRequest;
}

export interface CaseClientUpdate extends CaseClientFunctionArguments {
  cases: CasesPatchRequest;
}

export interface CaseClientAddComment extends CaseClientFunctionArguments {
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientFactoryArguments {
  savedObjectsClient: SavedObjectsClientContract;
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}

export interface CaseClient {
  create: (args: CaseClientCreate) => Promise<CaseResponse>;
  update: (args: CaseClientUpdate) => Promise<CasesResponse>;
  addComment: (args: CaseClientAddComment) => Promise<CaseResponse>;
}

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}
