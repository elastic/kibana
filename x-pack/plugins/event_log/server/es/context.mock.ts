/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ClusterClient } from '../../../../../src/core/server';
import { EsContext } from './context';

import { EsNames } from './names';

export type EsClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;

export interface EsError {
  readonly statusCode: number;
  readonly message: string;
}

interface CreateMockEsContextParams {
  logger: Logger;
  esNames: EsNames;
}

export function createMockEsContext(params: CreateMockEsContextParams): EsContext {
  return new EsContextMock(params);
}

class EsContextMock implements EsContext {
  public logger: Logger;
  public esNames: EsNames;

  constructor(params: CreateMockEsContextParams) {
    this.logger = params.logger;
    this.esNames = params.esNames;
  }

  initialize() {}

  async waitTillReady(): Promise<boolean> {
    return true;
  }

  async callEs(operation: string, body?: any): Promise<any> {
    return {};
  }
}
