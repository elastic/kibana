/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from './types';
import { CasesSubClient, createCasesSubClient } from './cases/client';
import { AttachmentsSubClient, createAttachmentsSubClient } from './attachments/client';
import { UserActionsSubClient, createUserActionsSubClient } from './user_actions/client';
import { CasesClientInternal, createCasesClientInternal } from './client_internal';

export class CasesClient {
  private readonly casesClientInternal: CasesClientInternal;
  private readonly _cases: CasesSubClient;
  private readonly _attachments: AttachmentsSubClient;
  private readonly _userActions: UserActionsSubClient;

  constructor(args: CasesClientArgs) {
    this.casesClientInternal = createCasesClientInternal(args);
    this._cases = createCasesSubClient(args, this, this.casesClientInternal);
    this._attachments = createAttachmentsSubClient(args, this.casesClientInternal);
    this._userActions = createUserActionsSubClient(args);
  }

  public get cases() {
    return this._cases;
  }

  public get attachments() {
    return this._attachments;
  }

  public get userActions() {
    return this._userActions;
  }
}

export const createCasesClient = (args: CasesClientArgs): CasesClient => {
  return new CasesClient(args);
};
