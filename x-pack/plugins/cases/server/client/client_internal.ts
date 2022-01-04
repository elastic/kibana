/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from './types';
import {
  InternalConfigureSubClient,
  createInternalConfigurationSubClient,
} from './configure/client';

export class CasesClientInternal {
  private readonly _configuration: InternalConfigureSubClient;

  constructor(args: CasesClientArgs) {
    this._configuration = createInternalConfigurationSubClient(args, this);
  }

  public get configuration() {
    return this._configuration;
  }
}

export const createCasesClientInternal = (args: CasesClientArgs): CasesClientInternal => {
  return new CasesClientInternal(args);
};
