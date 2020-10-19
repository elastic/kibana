/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from '../../../../../src/core/server';
import { CasePostRequest, CasesPatchRequest, CommentRequest } from '../../common/api';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../services';

export interface CaseClientFunctionArguments {
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface CaseClientCreate extends CaseClientFunctionArguments {
  theCase: CasePostRequest;
}

export interface CaseClientUpdate extends CaseClientFunctionArguments {
  theCase: CasesPatchRequest;
}

export interface CaseClientAddComment extends CaseClientFunctionArguments {
  caseId: string;
  comment: CommentRequest;
}

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}

export interface CaseClient {
  create: (args: CaseClientCreate) => void;
  update: (args: CaseClientUpdate) => void;
  addComment: (args: CaseClientAddComment) => void;
}

export interface CaseClientFactoryArguments {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}
