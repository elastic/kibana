/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import getPort from 'get-port';
import * as glob from 'glob';
import { platform as getOsPlatform } from 'os';
import path from 'path';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export class JavaLauncher implements ILanguageServerLauncher {
  private isRunning: boolean = false;
  constructor(
    readonly targetHost: string,
    readonly detach: boolean,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {}
  public get running(): boolean {
    return this.isRunning;
  }

  public async launch(builtinWorkspace: boolean, maxWorkspace: number, installationPath: string) {
    let port = 2090;

    if (!this.detach) {
      port = await getPort();
    }
    const log = this.loggerFactory.getLogger(['code', `java@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);
    proxy.awaitServerConnection();
    if (this.detach) {
      // detach mode
      proxy.onConnected(() => {
        this.isRunning = true;
      });
      proxy.onDisconnected(() => {
        this.isRunning = false;
        if (!proxy.isClosed) {
          proxy.awaitServerConnection();
        }
      });
    } else {
      let child = this.spawnJava(installationPath, port, log);
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          child.kill();
          proxy.awaitServerConnection();
          log.warn('language server disconnected, restarting it');
          child = this.spawnJava(installationPath, port, log);
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
    return new Promise<RequestExpander>(resolve => {
      proxy.onConnected(() => {
        resolve(new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options));
      });
    });
  }

  private spawnJava(installationPath: string, port: number, log: Logger) {
    const launchersFound = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', {
      cwd: installationPath,
    });
    if (!launchersFound.length) {
      log.error('cannot find executable jar for JavaLsp');
    }

    function findJDK(platform: string) {
      const JDKFound = glob.sync(`**/jdks/*${platform}/jdk-*`, {
        cwd: installationPath,
      });
      if (!JDKFound.length) {
        log.error('cannot find executable JDK');
      }
      return JDKFound;
    }

    let config = './config_mac/';
    let javaPath = '';
    let javaHomePath = '';
    // detect platform
    switch (getOsPlatform()) {
      case 'darwin':
        javaHomePath = `${findJDK('darwin')}/Contents/Home`;
        javaPath = `${javaHomePath}/bin/java`;
        break;
      case 'win32':
        javaHomePath = `${findJDK('windows')}`;
        javaPath = `${javaHomePath}/bin/java.exe`;
        config = './config_win/';
        break;
      case 'linux':
        javaHomePath = `${findJDK('linux')}`;
        javaPath = `${javaHomePath}/bin/java`;
        config = './config_linux/';
        break;
      default:
        log.error('Unable to find platform for this os');
    }
    process.env.CLIENT_HOST = '127.0.0.1';
    process.env.CLIENT_PORT = port.toString();
    process.env.JAVA_HOME = javaHomePath;

    const p = spawn(
      javaPath,
      [
        '-Declipse.application=org.elastic.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.elastic.jdt.ls.core.product',
        '-Dlog.level=ALL',
        '-noverify',
        '-Xmx4G',
        '-jar',
        path.resolve(installationPath, launchersFound[0]),
        '-configuration',
        path.resolve(installationPath, config),
        '-data',
        this.options.jdtWorkspacePath,
      ],
      {
        detached: false,
        stdio: 'pipe',
        env: process.env,
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
    log.info(
      `Launch Java Language Server at port ${process.env.CLIENT_PORT}, pid:${p.pid}, JAVA_HOME:${
        process.env.JAVA_HOME
      }`
    );
    return p;
  }
}
