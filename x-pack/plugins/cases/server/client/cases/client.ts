/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CasePostRequest,
  CasesPatchRequest,
  CasesFindRequest,
  User,
  AllTagsFindRequest,
  AllReportersFindRequest,
  AlertResponse,
} from '../../../common/api';
import { CasesClient } from '../client';
import { CasesClientInternal } from '../client_internal';
import {
  ICasePostRequest,
  ICaseResponse,
  ICasesFindRequest,
  ICasesFindResponse,
  ICasesPatchRequest,
  ICasesResponse,
} from '../typedoc_interfaces';
import { CasesClientArgs } from '../types';
import { create } from './create';
import { deleteCases } from './delete';
import { find } from './find';
import {
  CaseIDsByAlertIDParams,
  get,
  getAllAlertsAttachToCase,
  GetAllAlertsAttachToCase,
  getCaseIDsByAlertID,
  GetParams,
  getReporters,
  getTags,
} from './get';
import { push, PushParams } from './push';
import { update } from './update';

/**
 * API for interacting with the cases entities.
 */
export interface CasesSubClient {
  /**
   * Creates a case.
   */
  create(data: ICasePostRequest): Promise<ICaseResponse>;
  /**
   * Returns cases that match the search criteria.
   *
   * If the `owner` field is left empty then all the cases that the user has access to will be returned.
   */
  find(params: ICasesFindRequest): Promise<ICasesFindResponse>;
  /**
   * Retrieves a single case with the specified ID.
   */
  get(params: GetParams): Promise<ICaseResponse>;
  /**
   * Pushes a specific case to an external system.
   */
  push(args: PushParams): Promise<ICaseResponse>;
  /**
   * Update the specified cases with the passed in values.
   */
  update(cases: ICasesPatchRequest): Promise<ICasesResponse>;
  /**
   * Delete a case and all its comments.
   *
   * @params ids an array of case IDs to delete
   */
  delete(ids: string[]): Promise<void>;
  /**
   * Retrieves all the tags across all cases the user making the request has access to.
   */
  getTags(params: AllTagsFindRequest): Promise<string[]>;
  /**
   * Retrieves all the reporters across all accessible cases.
   */
  getReporters(params: AllReportersFindRequest): Promise<User[]>;
  /**
   * Retrieves the case IDs given a single alert ID
   */
  getCaseIDsByAlertID(params: CaseIDsByAlertIDParams): Promise<string[]>;
  /**
   * Retrieves all alerts attach to a case given a single case ID
   */
  getAllAlertsAttachToCase(params: GetAllAlertsAttachToCase): Promise<AlertResponse>;
}

/**
 * Creates the interface for CRUD on cases objects.
 *
 * @ignore
 */
export const createCasesSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): CasesSubClient => {
  const casesSubClient: CasesSubClient = {
    create: (data: CasePostRequest) => create(data, clientArgs),
    find: (params: CasesFindRequest) => find(params, clientArgs),
    get: (params: GetParams) => get(params, clientArgs),
    push: (params: PushParams) => push(params, clientArgs, casesClient, casesClientInternal),
    update: (cases: CasesPatchRequest) => update(cases, clientArgs, casesClientInternal),
    delete: (ids: string[]) => deleteCases(ids, clientArgs),
    getTags: (params: AllTagsFindRequest) => getTags(params, clientArgs),
    getReporters: (params: AllReportersFindRequest) => getReporters(params, clientArgs),
    getCaseIDsByAlertID: (params: CaseIDsByAlertIDParams) =>
      getCaseIDsByAlertID(params, clientArgs),
    getAllAlertsAttachToCase: (params: GetAllAlertsAttachToCase) =>
      getAllAlertsAttachToCase(params, clientArgs, casesClient),
  };

  return Object.freeze(casesSubClient);
};
