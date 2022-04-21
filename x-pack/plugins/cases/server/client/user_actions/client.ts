/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICaseUserActionsResponse } from '../typedoc_interfaces';
import { CasesClientArgs } from '../types';
import { get } from './get';

/**
 * Parameters for retrieving user actions for a particular case
 */
export interface UserActionGet {
  /**
   * The ID of the case
   */
  caseId: string;
}

/**
 * API for interacting the actions performed by a user when interacting with the cases entities.
 */
export interface UserActionsSubClient {
  /**
   * Retrieves all user actions for a particular case.
   */
  getAll(clientArgs: UserActionGet): Promise<ICaseUserActionsResponse>;
}

/**
 * Creates an API object for interacting with the user action entities
 *
 * @ignore
 */
export const createUserActionsSubClient = (clientArgs: CasesClientArgs): UserActionsSubClient => {
  const attachmentSubClient: UserActionsSubClient = {
    getAll: (params: UserActionGet) => get(params, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
