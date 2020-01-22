/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, PluginInitializerContext, Logger } from 'kibana/server';
import { IngestManagerConfigType } from './';

export class IngestManagerPlugin implements Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup) {
    const config = this.initializerContext.config.create<IngestManagerConfigType>();
    this.log.debug(`Setting up Ingest Manager with the config: ${JSON.stringify(config)}`);
  }

  public async start() {}

  public async stop() {}
}
