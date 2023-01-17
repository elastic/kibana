/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetCaseConnectorsResponse,
  CaseUserActionsResponse,
  UserActionFindResponse,
} from '../../../common/api';
import type { CasesClientArgs } from '../types';
import { get } from './get';
import { getConnectors } from './connectors';
import type { GetConnectorsRequest, UserActionFind, UserActionGet } from './types';
import { find } from './find';

/**
 * API for interacting the actions performed by a user when interacting with the cases entities.
 */
export interface UserActionsSubClient {
  find(clientArgs: UserActionFind): Promise<UserActionFindResponse>;
  /**
   * Retrieves all user actions for a particular case.
   */
  getAll(clientArgs: UserActionGet): Promise<CaseUserActionsResponse>;
  /**
   * Retrieves all the connectors used within a given case
   */
  getConnectors(clientArgs: GetConnectorsRequest): Promise<GetCaseConnectorsResponse>;
}

/**
 * Creates an API object for interacting with the user action entities
 */
export const createUserActionsSubClient = (clientArgs: CasesClientArgs): UserActionsSubClient => {
  const attachmentSubClient: UserActionsSubClient = {
    find: (params) => find(params, clientArgs),
    getAll: (params: UserActionGet) => get(params, clientArgs),
    getConnectors: (params: GetConnectorsRequest) => getConnectors(params, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
