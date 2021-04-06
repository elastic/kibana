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
import { SubCasesClient } from './sub_cases/client';

export class CasesClient {
  private readonly _casesClientInternal: CasesClientInternal;
  private readonly _cases: CasesSubClient;
  private readonly _attachments: AttachmentsSubClient;
  private readonly _userActions: UserActionsSubClient;
  private readonly _subCases: SubCasesClient;

  constructor(args: CasesClientArgs) {
    this._casesClientInternal = createCasesClientInternal(args);
    this._cases = createCasesSubClient(args, this, this._casesClientInternal);
    this._attachments = createAttachmentsSubClient(args, this._casesClientInternal);
    this._userActions = createUserActionsSubClient(args);
    this._subCases = new SubCasesClient(args);
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

  public get subCases() {
    return this._subCases;
  }

  // TODO: Remove it when all routes will be moved to the cases client.
  public get casesClientInternal() {
    return this._casesClientInternal;
  }
}

export const createCasesClient = (args: CasesClientArgs): CasesClient => {
  return new CasesClient(args);
};
