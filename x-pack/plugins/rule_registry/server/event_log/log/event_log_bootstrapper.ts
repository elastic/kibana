/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { IIndexBootstrapper, IndexSpecification } from '../elasticsearch';

interface ConstructorParams {
  indexSpec: IndexSpecification;
  indexBootstrapper: IIndexBootstrapper;
  isWriteEnabled: boolean;
  logger: Logger;
}

export class EventLogBootstrapper {
  private readonly indexSpec: IndexSpecification;
  private readonly indexBootstrapper: IIndexBootstrapper;
  private readonly logger: Logger;
  private readonly isWriteEnabled: boolean;
  private isIndexBootstrapped: boolean;

  constructor(params: ConstructorParams) {
    this.indexSpec = params.indexSpec;
    this.indexBootstrapper = params.indexBootstrapper;
    this.logger = params.logger.get('EventLogBootstrapper');
    this.isWriteEnabled = params.isWriteEnabled;
    this.isIndexBootstrapped = false;
  }

  public async run(): Promise<void> {
    if (this.isIndexBootstrapped || !this.isWriteEnabled) {
      return;
    }

    const { logName, indexAliasName } = this.indexSpec.indexNames;
    const logInfo = `log="${logName}" index="${indexAliasName}"`;

    this.logger.debug(`Bootstrapping started, ${logInfo}`);
    this.isIndexBootstrapped = await this.indexBootstrapper.run(this.indexSpec);
    this.logger.debug(
      `Bootstrapping ${this.isIndexBootstrapped ? 'succeeded' : 'failed'}, ${logInfo}`
    );

    if (!this.isIndexBootstrapped) {
      throw new Error(`Event log bootstrapping failed, ${logInfo}`);
    }
  }
}
