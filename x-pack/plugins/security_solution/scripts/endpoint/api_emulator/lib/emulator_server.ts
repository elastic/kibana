/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Hapi from '@hapi/hapi';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DeferredPromiseInterface } from '../../common/utils';
import { getDeferredPromise, prefixedOutputLogger } from '../../common/utils';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface EmulatorServerOptions {
  logger?: ToolingLog;
  logPrefix?: string;
}

export class EmulatorServer {
  protected server: Hapi.Server | undefined = undefined;
  protected log: ToolingLog;
  private stoppedDeferred: DeferredPromiseInterface = getDeferredPromise();

  constructor(protected readonly options: EmulatorServerOptions = {}) {
    this.log = prefixedOutputLogger(
      (this.options.logPrefix || this.constructor.name) ?? 'EmulatorServer',
      options.logger ?? createToolingLogger()
    );

    this.stoppedDeferred.resolve();
    this.log.verbose(`Instance created`);
  }

  /**
   * Returns a promise that resolves when the server is stopped
   */
  public get stopped(): Promise<void> {
    return this.stoppedDeferred.promise;
  }

  public registerRoute() {}

  public async start() {
    if (!this.server) {
      this.server = Hapi.server();
      this.stoppedDeferred = getDeferredPromise();
      await this.server.start();

      this.server.events.on('stop', () => {
        this.log.verbose(`Hapi server was stopped!`);
        this.stoppedDeferred.resolve();
      });

      this.log.debug(`Server started and available at: ${this.server.info.uri}`);
    }
  }

  public async stop() {
    if (this.server) {
      this.log.debug(`Stopping Hapi server: ${this.server.info.uri}`);
      await this.server.stop();
      this.server = undefined;
    }
  }
}
