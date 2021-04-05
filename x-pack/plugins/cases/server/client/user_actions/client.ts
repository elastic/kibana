/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseUserActionsResponse } from '../../../common/api';
import { CasesSubClientImplementation } from '../types';
import { get } from './get';

export interface UserActionGet {
  caseId: string;
  subCaseId?: string;
}

export interface UserActionsSubClient {
  getAll(args: UserActionGet): Promise<CaseUserActionsResponse>;
}

export const createUserActionsSubClient: CasesSubClientImplementation<UserActionsSubClient> = (
  args
) => {
  const { savedObjectsClient, userActionService } = args;

  const attachmentSubClient: UserActionsSubClient = {
    getAll: (params: UserActionGet) =>
      get({
        ...params,
        savedObjectsClient,
        userActionService,
      }),
  };

  return Object.freeze(attachmentSubClient);
};
