/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';
import { Logger } from 'kibana/server';

import { IIndexBootstrapper, IndexSpecification } from '../elasticsearch';
import { ReadySignal, createReadySignal } from '../utils/ready_signal';

interface ConstructorParams {
  indexSpec: IndexSpecification;
  indexBootstrapper: IIndexBootstrapper;
  isWriteEnabled: boolean;
  logger: Logger;
}

export class EventLogBootstrapper {
  private readonly indexSpec: IndexSpecification;
  private readonly indexBootstrapper: IIndexBootstrapper;
  private readonly isWriteEnabled: boolean;
  private readonly logger: Logger;
  private readonly bootstrappingFinished: ReadySignal<EventLogBootstrappingResult>;

  constructor(params: ConstructorParams) {
    this.indexSpec = params.indexSpec;
    this.indexBootstrapper = params.indexBootstrapper;
    this.isWriteEnabled = params.isWriteEnabled;
    this.logger = params.logger.get('EventLogBootstrapper');
    this.bootstrappingFinished = createReadySignal<EventLogBootstrappingResult>();
  }

  public start(): void {
    // TODO: descriptive log messages, proper error handling

    const { logName, indexAliasName } = this.indexSpec.indexNames;
    const logInfo = `log="${logName}" index="${indexAliasName}"`;

    if (!this.isWriteEnabled) {
      // TODO: perhaps write=disable should prevent only writing to indices as opposed to also creating them
      // Then this check would need to be removed
      this.logger.debug(`Bootstrapping is disabled, ${logInfo}`);
      this.finished(false); // ??
      return;
    }

    Promise.resolve()
      .then(async () => {
        this.logger.debug(`Bootstrapping started, ${logInfo}`);
        const result = await this.indexBootstrapper.run(this.indexSpec);
        this.logger.debug(`Bootstrapping ${result ? 'succeeded' : 'failed'}, ${logInfo}`);
        this.finished(result);
      })
      .catch((e) => {
        // TODO: test and choose one
        this.logger.error(inspect(e, { depth: null }));
        // this.logger.error(e);
        this.finished(false);
      });
  }

  private finished(success: boolean) {
    this.bootstrappingFinished.signal({ success });
  }

  public waitUntilFinished(): Promise<EventLogBootstrappingResult> {
    return this.bootstrappingFinished.wait();
  }
}

export interface EventLogBootstrappingResult {
  success: boolean;
}
