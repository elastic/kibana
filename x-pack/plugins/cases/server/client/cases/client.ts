/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions/server';
import {
  CasePostRequest,
  CaseResponse,
  CasesPatchRequest,
  CasesResponse,
  CasesFindRequest,
  CasesFindResponse,
} from '../../../common/api';
import { CasesSubClientImplementation } from '../types';
import { create } from './create';
import { find } from './find';
import { get } from './get';
import { push } from './push';
import { update } from './update';

export interface CaseGet {
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

export interface CasePush {
  actionsClient: ActionsClient;
  caseId: string;
  connectorId: string;
}

export interface CasesSubClient {
  create(theCase: CasePostRequest): Promise<CaseResponse>;
  find(args: CasesFindRequest): Promise<CasesFindResponse>;
  get(args: CaseGet): Promise<CaseResponse>;
  push(args: CasePush): Promise<CaseResponse>;
  update(args: CasesPatchRequest): Promise<CasesResponse>;
}

export const createCasesSubClient: CasesSubClientImplementation<CasesSubClient> = (
  args,
  getClientsFactories
) => {
  const {
    caseConfigureService,
    caseService,
    user,
    savedObjectsClient,
    userActionService,
    logger,
    authorization,
  } = args;

  const { getCasesClient, getCasesInternalClient } = getClientsFactories;

  const casesSubClient: CasesSubClient = {
    create: (theCase: CasePostRequest) =>
      create({
        savedObjectsClient,
        caseService,
        caseConfigureService,
        userActionService,
        user,
        theCase,
        logger,
        auth: authorization,
      }),
    find: (options: CasesFindRequest) =>
      find({
        savedObjectsClient,
        caseService,
        logger,
        auth: authorization,
        options,
      }),
    get: (params: CaseGet) =>
      get({
        ...params,
        caseService,
        savedObjectsClient,
        logger,
      }),
    push: (params: CasePush) =>
      push({
        ...params,
        savedObjectsClient,
        caseService,
        userActionService,
        user,
        getCasesClient,
        getCasesInternalClient,
        caseConfigureService,
        logger,
      }),
    update: (cases: CasesPatchRequest) =>
      update({
        savedObjectsClient,
        caseService,
        userActionService,
        user,
        cases,
        getCasesInternalClient,
        logger,
      }),
  };

  return casesSubClient;
};
