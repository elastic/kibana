/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseUserActionsResponse } from '../../../common/api';
import { CasesClientArgs } from '../types';
import { get } from './get';

export interface UserActionGet {
  /**
   * The ID of the case
   */
  caseId: string;
  /**
   * If specified then a sub case will be used for finding all the user actions
   */
  subCaseId?: string;
}

/**
 * API for interacting the actions performed by a user when interacting with the cases entities.
 *
 * @public
 */
export interface UserActionsSubClient {
  /**
   * Retrieves all user actions for a particular case.
   */
  getAll(clientArgs: UserActionGet): Promise<CaseUserActionsResponse>;
}

export const createUserActionsSubClient = (clientArgs: CasesClientArgs): UserActionsSubClient => {
  const attachmentSubClient: UserActionsSubClient = {
    getAll: (params: UserActionGet) => get(params, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
