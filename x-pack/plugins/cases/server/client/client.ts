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
import { ConfigureSubClient, createConfigurationSubClient } from './configure/client';
import { createMetricsSubClient, MetricsSubClient } from './metrics/client';

/**
 * Client wrapper that contains accessor methods for individual entities within the cases system.
 */
export class CasesClient {
  private readonly _casesClientInternal: CasesClientInternal;
  private readonly _cases: CasesSubClient;
  private readonly _attachments: AttachmentsSubClient;
  private readonly _userActions: UserActionsSubClient;
  private readonly _configure: ConfigureSubClient;
  private readonly _metrics: MetricsSubClient;

  constructor(args: CasesClientArgs) {
    this._casesClientInternal = createCasesClientInternal(args);
    this._cases = createCasesSubClient(args, this, this._casesClientInternal);
    this._attachments = createAttachmentsSubClient(args, this, this._casesClientInternal);
    this._userActions = createUserActionsSubClient(args);
    this._configure = createConfigurationSubClient(args, this._casesClientInternal);
    this._metrics = createMetricsSubClient(args, this);
  }

  /**
   * Retrieves an interface for interacting with cases entities.
   */
  public get cases() {
    return this._cases;
  }

  /**
   * Retrieves an interface for interacting with attachments (comments) entities.
   */
  public get attachments() {
    return this._attachments;
  }

  /**
   * Retrieves an interface for interacting with the user actions associated with the plugin entities.
   */
  public get userActions() {
    return this._userActions;
  }

  /**
   * Retrieves an interface for interacting with the configuration of external connectors for the plugin entities.
   */
  public get configure() {
    return this._configure;
  }

  /**
   * Retrieves an interface for retrieving metrics related to the cases entities.
   */
  public get metrics() {
    return this._metrics;
  }
}

/**
 * Creates a {@link CasesClient} for interacting with the cases entities
 *
 * @param args arguments for initializing the cases client
 * @returns a {@link CasesClient}
 *
 * @ignore
 */
export const createCasesClient = (args: CasesClientArgs): CasesClient => {
  return new CasesClient(args);
};
