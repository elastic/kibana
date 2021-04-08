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
import { createSubCasesClient, SubCasesClient } from './sub_cases/client';
import { ENABLE_CASE_CONNECTOR } from '../../common/constants';
import { ConfigureSubClient, createConfigurationSubClient } from './configure/client';
import { createReportersSubClient, ReportersSubClient } from './reporters/client';
import { createStatusStatsSubClient, StatusStatsSubClient } from './status_stats/client';
import { createTagsSubClient, TagsSubClient } from './tags/client';

export class CasesClient {
  private readonly _casesClientInternal: CasesClientInternal;
  private readonly _cases: CasesSubClient;
  private readonly _attachments: AttachmentsSubClient;
  private readonly _userActions: UserActionsSubClient;
  private readonly _subCases: SubCasesClient;
  private readonly _configure: ConfigureSubClient;
  private readonly _reporters: ReportersSubClient;
  private readonly _statusStats: StatusStatsSubClient;
  private readonly _tags: TagsSubClient;

  constructor(args: CasesClientArgs) {
    this._casesClientInternal = createCasesClientInternal(args);
    this._cases = createCasesSubClient(args, this, this._casesClientInternal);
    this._attachments = createAttachmentsSubClient(args, this._casesClientInternal);
    this._userActions = createUserActionsSubClient(args);
    this._subCases = createSubCasesClient(args, this);
    this._configure = createConfigurationSubClient(args, this._casesClientInternal);
    this._reporters = createReportersSubClient(args);
    this._statusStats = createStatusStatsSubClient(args);
    this._tags = createTagsSubClient(args);
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
    if (!ENABLE_CASE_CONNECTOR) {
      throw new Error('The case connector feature is disabled');
    }
    return this._subCases;
  }

  public get configure() {
    return this._configure;
  }

  public get reporters() {
    return this._reporters;
  }

  public get statusStats() {
    return this._statusStats;
  }

  public get tags() {
    return this._tags;
  }

  // TODO: Remove it when all routes will be moved to the cases client.
  public get casesClientInternal() {
    return this._casesClientInternal;
  }
}

export const createCasesClient = (args: CasesClientArgs): CasesClient => {
  return new CasesClient(args);
};
