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
  User,
  AllTagsFindRequest,
  AllReportersFindRequest,
} from '../../../common/api';
import { CasesClient } from '../client';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { create } from './create';
import { deleteCases } from './delete';
import { find } from './find';
import { get, getReporters, getTags } from './get';
import { push } from './push';
import { update } from './update';

interface CaseGet {
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

interface CasePush {
  actionsClient: ActionsClient;
  caseId: string;
  connectorId: string;
}

/**
 * The public API for interacting with cases.
 */
export interface CasesSubClient {
  create(data: CasePostRequest): Promise<CaseResponse>;
  find(params: CasesFindRequest): Promise<CasesFindResponse>;
  get(params: CaseGet): Promise<CaseResponse>;
  push(args: CasePush): Promise<CaseResponse>;
  update(cases: CasesPatchRequest): Promise<CasesResponse>;
  delete(ids: string[]): Promise<void>;
  getTags(params: AllTagsFindRequest): Promise<string[]>;
  getReporters(params: AllReportersFindRequest): Promise<User[]>;
}

/**
 * Creates the interface for CRUD on cases objects.
 */
export const createCasesSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): CasesSubClient => {
  const casesSubClient: CasesSubClient = {
    create: (data: CasePostRequest) => create(data, clientArgs),
    find: (params: CasesFindRequest) => find(params, clientArgs),
    get: (params: CaseGet) => get(params, clientArgs),
    push: (params: CasePush) => push(params, clientArgs, casesClient, casesClientInternal),
    update: (cases: CasesPatchRequest) => update(cases, clientArgs, casesClientInternal),
    delete: (ids: string[]) => deleteCases(ids, clientArgs),
    getTags: (params: AllTagsFindRequest) => getTags(params, clientArgs),
    getReporters: (params: AllReportersFindRequest) => getReporters(params, clientArgs),
  };

  return Object.freeze(casesSubClient);
};
