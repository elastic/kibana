/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess } from 'child_process';
import { ILanguageServerLauncher } from './language_server_launcher';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { Logger } from '../log';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export abstract class AbstractLauncher implements ILanguageServerLauncher {
  running: boolean = false;
  private _currentPid: number = -1;
  private child: ChildProcess | null = null;
  private _startTime: number = -1;
  private _proxyConnected: boolean = false;
  protected constructor(
    readonly name: string,
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {}

  public async launch(builtinWorkspace: boolean, maxWorkspace: number, installationPath: string) {
    const port = await this.getPort();
    const log: Logger = this.loggerFactory.getLogger([
      'code',
      `${this.name}@${this.targetHost}:${port}`,
    ]);
    let child: ChildProcess;
    const proxy = new LanguageServerProxy(port, this.targetHost, log, this.options.lsp);
    if (this.options.lsp.detach) {
      log.debug('Detach mode, expected language server launch externally');
      proxy.onConnected(() => {
        this.running = true;
      });
      proxy.onDisconnected(() => {
        this.running = false;
        if (!proxy.isClosed) {
          log.debug(`${this.name} language server disconnected, reconnecting`);
          setTimeout(() => this.reconnect(proxy, installationPath, port, log), 1000);
        }
      });
    } else {
      child = await this.spawnProcess(installationPath, port, log);
      this.child = child;
      log.debug('spawned a child process ' + child.pid);
      this._currentPid = child.pid;
      this._startTime = Date.now();
      this.running = true;
      this.onProcessExit(child, () => this.reconnect(proxy, installationPath, port, log));
      proxy.onDisconnected(async () => {
        this._proxyConnected = true;
        if (!proxy.isClosed) {
          log.debug('proxy disconnected, reconnecting');
          setTimeout(async () => {
            await this.reconnect(proxy, installationPath, port, log, child);
          }, 1000);
        } else if (this.child) {
          log.info('proxy closed, kill process');
          await this.killProcess(this.child, log);
        }
      });
    }
    proxy.onExit(() => {
      log.debug('proxy exited, is the process running? ' + this.running);
      if (this.child && this.running) {
        const p = this.child!;
        setTimeout(async () => {
          if (!p.killed) {
            log.debug('killing the process after 1s');
            await this.killProcess(p, log);
          }
        }, 1000);
      }
    });
    proxy.listen();
    this.startConnect(proxy);
    await new Promise(resolve => {
      proxy.onConnected(() => {
        this._proxyConnected = true;
        resolve();
      });
    });
    return this.createExpander(proxy, builtinWorkspace, maxWorkspace);
  }

  private onProcessExit(child: ChildProcess, reconnectFn: () => void) {
    const pid = child.pid;
    child.on('exit', () => {
      if (this._currentPid === pid) {
        this.running = false;
        // if the process exited before proxy connected, then we reconnect
        if (!this._proxyConnected) {
          reconnectFn();
        }
      }
    });
  }

  /**
   * proxy should be connected within this timeout, otherwise we reconnect.
   */
  protected startupTimeout = 3000;

  /**
   * try reconnect the proxy when disconnected
   */
  public async reconnect(
    proxy: LanguageServerProxy,
    installationPath: string,
    port: number,
    log: Logger,
    child?: ChildProcess
  ) {
    log.debug('reconnecting');
    if (this.options.lsp.detach) {
      this.startConnect(proxy);
    } else {
      const processExpired = () => Date.now() - this._startTime > this.startupTimeout;
      if (child && !child.killed && !processExpired()) {
        this.startConnect(proxy);
      } else {
        if (child && this.running) {
          log.debug('killing the old process.');
          await this.killProcess(child, log);
        }
        this.child = await this.spawnProcess(installationPath, port, log);
        log.debug('spawned a child process ' + this.child.pid);
        this._currentPid = this.child.pid;
        this._startTime = Date.now();
        this.running = true;
        this.onProcessExit(this.child, () =>
          this.reconnect(proxy, installationPath, port, log, child)
        );
        this.startConnect(proxy);
      }
    }
  }

  abstract async getPort(): Promise<number>;

  startConnect(proxy: LanguageServerProxy) {
    proxy.connect();
  }

  /**
   * await for proxy connected, create a request expander
   * @param proxy
   */
  abstract createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander;

  abstract async spawnProcess(
    installationPath: string,
    port: number,
    log: Logger
  ): Promise<ChildProcess>;

  private killProcess(child: ChildProcess, log: Logger) {
    if (!child.killed) {
      return new Promise<boolean>((resolve, reject) => {
        // if not killed within 1s
        const t = setTimeout(reject, 1000);
        child.on('exit', () => {
          clearTimeout(t);
          resolve(true);
        });
        child.kill();
        log.info('killed process ' + child.pid);
      })
        .catch(() => {
          // force kill
          child.kill('SIGKILL');
          log.info('force killed process ' + child.pid);
          return child.killed;
        })
        .finally(() => {
          if (this._currentPid === child.pid) this.running = false;
        });
    }
  }
}
