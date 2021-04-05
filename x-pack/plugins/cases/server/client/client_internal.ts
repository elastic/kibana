/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from './types';
import { AlertSubClient, createAlertsSubClient } from './alerts/client';
import { ConfigureSubClient, createConfigurationSubClient } from './configure/client';

export class CasesClientInternal {
  private readonly args: CasesClientArgs;
  private readonly _alerts: AlertSubClient;
  private readonly _configuration: ConfigureSubClient;

  constructor(args: CasesClientArgs) {
    this.args = args;
    this._alerts = createAlertsSubClient(this.args);
    this._configuration = createConfigurationSubClient(this.args, this);
  }

  public get alerts() {
    return this._alerts;
  }

  public get configuration() {
    return this._configuration;
  }
}

export const createCasesClientInternal = (args: CasesClientArgs): CasesClientInternal => {
  return new CasesClientInternal(args);
};
