/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { Logger } from 'kibana/server';
import { IndexNames } from '../common';
import { IIndexBootstrapper } from '../elasticsearch';
import { ReadySignal, createReadySignal } from '../utils/ready_signal';

interface ConstructorParams {
  indexNames: IndexNames;
  indexBootstrapper: IIndexBootstrapper;
  isWriteEnabled: boolean;
  logger: Logger;
}

export type BootstrappingResult = 'success' | Error;

export class BootstrapperOfCommonResources {
  private readonly indexNames: IndexNames;
  private readonly indexBootstrapper: IIndexBootstrapper;
  private readonly isWriteEnabled: boolean;
  private readonly logger: Logger;
  private readonly result: ReadySignal<BootstrappingResult>;

  constructor(params: ConstructorParams) {
    this.indexNames = params.indexNames;
    this.indexBootstrapper = params.indexBootstrapper;
    this.isWriteEnabled = params.isWriteEnabled;
    this.logger = params.logger.get('BootstrapperOfCommonResources');
    this.result = createReadySignal();
  }

  private startOnce = once((): void => {
    const { indexNames, indexBootstrapper, isWriteEnabled, logger, result } = this;
    const { indexPrefix } = indexNames;

    if (!isWriteEnabled) {
      return;
    }

    Promise.resolve()
      .then(async () => {
        logger.debug(`Bootstrapping common resources for "${indexPrefix}"`);
        await indexBootstrapper.bootstrapCommonResources(indexNames);
        logger.debug(`Bootstrapping done for "${indexPrefix}"`);

        result.signal('success');
      })
      .catch((e: Error) => {
        logger.error(e);
        logger.debug(`Bootstrapping failed for "${indexPrefix}": ${e.message}`);

        result.signal(e);
      });
  });

  public start(): void {
    this.startOnce();
  }

  public waitUntilFinished(): Promise<BootstrappingResult> {
    return this.result.wait();
  }
}
