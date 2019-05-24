/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export class GoLauncher implements ILanguageServerLauncher {
  private isRunning: boolean = false;
  constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {}
  public get running(): boolean {
    return this.isRunning;
  }

  public async launch(builtinWorkspace: boolean, maxWorkspace: number, installationPath: string) {
    const port = 2091;

    const log = this.loggerFactory.getLogger(['code', `go@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log, this.options.lsp);

    log.info('Detach mode, expected langserver launch externally');
    proxy.onConnected(() => {
      this.isRunning = true;
    });
    proxy.onDisconnected(() => {
      this.isRunning = false;
      if (!proxy.isClosed) {
        log.warn('language server disconnected, reconnecting');
        setTimeout(() => proxy.connect(), 1000);
      }
    });

    proxy.listen();
    await proxy.connect();
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options);
  }
}
