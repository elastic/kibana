/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClient, CasesClientArgs } from './types';
import { createCasesSubClient } from './cases/client';
import { createAttachmentsSubClient } from './attachments/client';
import { createUserActionsSubClient } from './user_actions/client';
import { createCasesClientInternal } from './client_internal';

export const createCasesClient = (args: CasesClientArgs): CasesClient => {
  const casesInternalClient = createCasesClientInternal(args, () => casesClient);

  const casesClient: CasesClient = {
    cases: createCasesSubClient(args, {
      getCasesClient: () => casesClient,
      getCasesInternalClient: () => casesInternalClient,
    }),
    attachments: createAttachmentsSubClient(args, {
      getCasesClient: () => casesClient,
      getCasesInternalClient: () => casesInternalClient,
    }),
    userActions: createUserActionsSubClient(args, {
      getCasesClient: () => casesClient,
      getCasesInternalClient: () => casesInternalClient,
    }),
  };

  return Object.freeze(casesClient);
};
