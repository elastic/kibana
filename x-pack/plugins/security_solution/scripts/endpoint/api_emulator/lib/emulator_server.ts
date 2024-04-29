/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Hapi from '@hapi/hapi';
import type { ToolingLog } from '@kbn/tooling-log';
import { prefixedOutputLogger } from '../../common/utils';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface EmulatorServerOptions {
  logger?: ToolingLog;
  logPrefix?: string;
}

export class EmulatorServer {
  protected server: Hapi.Server | undefined = undefined;
  protected log: ToolingLog;

  constructor(protected readonly options: EmulatorServerOptions = {}) {
    this.log = prefixedOutputLogger(
      (this.options.logPrefix || this.constructor.name) ?? 'EmulatorServer',
      options.logger ?? createToolingLogger()
    );

    this.log.verbose(`Instance created`);
  }

  public registerRoute() {}

  public async start() {
    if (!this.server) {
      this.server = Hapi.server();
      await this.server.start();
      this.log.debug(`Server started and available at: ${this.server.info.uri}`);
    }
  }

  public async stop() {
    if (this.server) {
      const uri = this.server.info.uri;
      await this.server.stop();
      this.log.debug(`Server stopped: ${uri}`);
      this.server = undefined;
    }
  }
}
