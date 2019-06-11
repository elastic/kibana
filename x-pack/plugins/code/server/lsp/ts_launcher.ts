/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess, spawn } from 'child_process';
import getPort from 'get-port';
import { resolve } from 'path';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';
import { AbstractLauncher } from './abstract_launcher';

const TS_LANG_DETACH_PORT = 2089;

export class TypescriptServerLauncher extends AbstractLauncher {
  public constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    super('typescript', targetHost, options, loggerFactory);
  }

  async getPort() {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return TS_LANG_DETACH_PORT;
  }

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options, {
      installNodeDependency: this.options.security.installNodeDependency,
      gitHostWhitelist: this.options.security.gitHostWhitelist,
    });
  }
  async spawnProcess(installationPath: string, port: number, log: Logger): Promise<ChildProcess> {
    const p = spawn(process.execPath, [installationPath, '-p', port.toString(), '-c', '1'], {
      detached: false,
      stdio: 'pipe',
      cwd: resolve(installationPath, '../..'),
    });
    p.stdout.on('data', data => {
      log.stdout(data.toString());
    });
    p.stderr.on('data', data => {
      log.stderr(data.toString());
    });
    return p;
  }
}
