/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess } from 'child_process';
import { ResponseError } from 'vscode-jsonrpc';
import { ILanguageServerLauncher } from './language_server_launcher';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { Logger } from '../log';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';
import { LanguageServerStartFailed } from '../../common/lsp_error_codes';

let seqNo = 1;

export const ServerStartFailed = new ResponseError(
  LanguageServerStartFailed,
  'Launch language server failed.'
);

export abstract class AbstractLauncher implements ILanguageServerLauncher {
  running: boolean = false;
  private _currentPid: number = -1;
  private child: ChildProcess | null = null;
  private _startTime: number = -1;
  private _proxyConnected: boolean = false;
  protected readonly log: Logger;
  private spawnTimes: number = 0;
  private launchReject?: ((reason?: any) => void);
  protected constructor(
    readonly name: string,
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    this.log = this.loggerFactory.getLogger([`${seqNo++}`, `${this.name}`, 'code']);
  }

  public async launch(builtinWorkspace: boolean, maxWorkspace: number, installationPath: string) {
    const port = await this.getPort();
    const log: Logger = this.log;
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
          setTimeout(() => this.reconnect(proxy, installationPath), 1000);
        }
      });
    } else {
      child = await this.spawnProcess(installationPath, port, log);
      this.spawnTimes += 1;
      this.child = child;
      log.debug('spawned a child process ' + child.pid);
      this._currentPid = child.pid;
      this._startTime = Date.now();
      this.running = true;
      this.onProcessExit(child, () => {
        if (!proxy.isClosed) this.reconnect(proxy, installationPath);
      });
      proxy.onDisconnected(async () => {
        this._proxyConnected = false;
        if (!proxy.isClosed) {
          log.debug('proxy disconnected, reconnecting');
          setTimeout(async () => {
            await this.reconnect(proxy, installationPath, child);
          }, 1000);
        } else if (this.child) {
          log.info('proxy closed, kill process');
          await this.killProcess(this.child);
        }
      });
    }
    proxy.onExit(() => {
      log.debug('proxy exited, is the process running? ' + this.running);
      if (this.child && this.running) {
        const p = this.child!;
        this.killProcess(p);
      }
    });
    proxy.listen();
    this.startConnect(proxy);
    await new Promise((resolve, reject) => {
      proxy.onConnected(() => {
        this._proxyConnected = true;
        resolve();
      });
      this.launchReject = err => {
        proxy.exit().catch(this.log.debug);
        reject(err);
      };
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
  protected startupTimeout = 10000;

  protected maxRespawn = 3;

  /**
   * try reconnect the proxy when disconnected
   */
  public async reconnect(
    proxy: LanguageServerProxy,
    installationPath: string,
    child?: ChildProcess
  ) {
    this.log.debug('reconnecting');
    if (this.options.lsp.detach) {
      this.startConnect(proxy);
    } else {
      const processExpired = () => Date.now() - this._startTime > this.startupTimeout;
      if (child && !child.killed && !processExpired()) {
        this.startConnect(proxy);
      } else {
        if (this.spawnTimes < this.maxRespawn) {
          if (child && this.running) {
            this.log.debug('killing the old process.');
            await this.killProcess(child);
          }
          const port = await this.getPort();
          proxy.changePort(port);
          this.child = await this.spawnProcess(installationPath, port, this.log);
          this.spawnTimes += 1;
          this.log.debug('spawned a child process ' + this.child.pid);
          this._currentPid = this.child.pid;
          this._startTime = Date.now();
          this.running = true;
          this.onProcessExit(this.child, () => this.reconnect(proxy, installationPath, child));
          this.startConnect(proxy);
        } else {
          this.log.warn(`spawned process ${this.spawnTimes} times, mark this proxy unusable.`);
          proxy.setError(ServerStartFailed);
          this.launchReject!(ServerStartFailed);
        }
      }
    }
  }

  abstract async getPort(): Promise<number>;

  startConnect(proxy: LanguageServerProxy) {
    proxy.connect().catch(this.log.debug);
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

  protected killProcess(child: ChildProcess) {
    if (!child.killed) {
      return new Promise<boolean>((resolve, reject) => {
        // if not killed within 1s
        const t = setTimeout(reject, 1000);
        child.on('exit', () => {
          clearTimeout(t);
          resolve(true);
        });
        child.kill();
        this.log.info('killed process ' + child.pid);
      })
        .catch(() => {
          // force kill
          child.kill('SIGKILL');
          this.log.info('force killed process ' + child.pid);
          return child.killed;
        })
        .finally(() => {
          if (this._currentPid === child.pid) this.running = false;
        });
    }
  }
}
