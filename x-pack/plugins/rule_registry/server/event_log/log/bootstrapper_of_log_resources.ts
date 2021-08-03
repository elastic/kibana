/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { IIndexBootstrapper, IndexSpec } from '../elasticsearch';
import { BootstrappingResult } from './bootstrapper_of_common_resources';

interface ConstructorParams {
  indexSpec: IndexSpec;
  indexBootstrapper: IIndexBootstrapper;
  isWriteEnabled: boolean;
  isMechanismReady: Promise<BootstrappingResult>;
  logger: Logger;
}

export class BootstrapperOfLogResources {
  private isIndexBootstrapped: boolean;

  constructor(private readonly params: ConstructorParams) {
    this.isIndexBootstrapped = false;
  }

  public async run(): Promise<void> {
    const { indexSpec, indexBootstrapper, isWriteEnabled, isMechanismReady } = this.params;

    if (this.isIndexBootstrapped || !isWriteEnabled) {
      return;
    }

    const mechanismBootstrappingResult = await isMechanismReady;
    if (mechanismBootstrappingResult !== 'success') {
      throw mechanismBootstrappingResult;
    }

    await indexBootstrapper.bootstrapLogLevelResources(indexSpec);

    this.isIndexBootstrapped = true;
  }
}
