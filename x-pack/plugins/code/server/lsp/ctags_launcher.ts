/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getPort from 'get-port';
import { spawn } from 'child_process';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { LanguageServerProxy } from './proxy';
import { Logger } from '../log';
import { RequestExpander } from './request_expander';
import { AbstractLauncher } from './abstract_launcher';

const CTAGS_LANG_DETACH_PORT = 2092;
export class CtagsLauncher extends AbstractLauncher {
  private isRunning: boolean = false;
  constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    super('ctags', targetHost, options, loggerFactory);
  }
  public get running(): boolean {
    return this.isRunning;
  }

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options);
  }

  startConnect(proxy: LanguageServerProxy) {
    proxy.awaitServerConnection();
  }

  async getPort(): Promise<number> {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return CTAGS_LANG_DETACH_PORT;
  }

  async spawnProcess(installationPath: string, port: number, log: Logger) {
    // TODO(pcxu): add spawn command here for ctags langserver
    return spawn('');
  }
}
