/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import getPort from 'get-port';
import { resolve } from 'path';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export class TypescriptServerLauncher implements ILanguageServerLauncher {
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
    let port = 2089;

    if (!this.options.lsp.detach) {
      port = await getPort();
    }
    const log: Logger = this.loggerFactory.getLogger(['code', `ts@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log, this.options.lsp);

    if (this.options.lsp.detach) {
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
    } else {
      const spawnTs = () => {
        const p = spawn(
          'node',
          ['--max_old_space_size=4096', installationPath, '-p', port.toString(), '-c', '1'],
          {
            detached: false,
            stdio: 'pipe',
            cwd: resolve(installationPath, '../..'),
          }
        );
        p.stdout.on('data', data => {
          log.stdout(data.toString());
        });
        p.stderr.on('data', data => {
          log.stderr(data.toString());
        });
        this.isRunning = true;
        p.on('exit', () => (this.isRunning = false));
        return p;
      };
      let child = spawnTs();
      log.info(`Launch Typescript Language Server at port ${port}, pid:${child.pid}`);
      // TODO: how to properly implement timeout socket connection? maybe config during socket connection
      // const reconnect = () => {
      //   log.debug('reconnecting');
      // promiseTimeout(3000, proxy.connect()).then(
      //   () => {
      //     log.info('connected');
      //   },
      //   () => {
      //     log.error('unable to connect within 3s, respawn ts server.');
      //     child.kill();
      //     child = spawnTs();
      //     setTimeout(reconnect, 1000);
      //   }
      // );
      // };
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          log.info('waiting language server to be connected');
          if (!this.isRunning) {
            log.error('detect language server killed, respawn ts server.');
            child = spawnTs();
          }
        } else {
          child.kill();
        }
      });
      proxy.onExit(() => {
        if (child) {
          child.kill();
        }
      });
    }
    proxy.listen();
    await proxy.connect();
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options, {
      installNodeDependency: this.options.security.installNodeDependency,
      gitHostWhitelist: this.options.security.gitHostWhitelist,
    });
  }
}
