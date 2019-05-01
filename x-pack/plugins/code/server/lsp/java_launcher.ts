/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execFile, spawn } from 'child_process';
import { existsSync } from 'fs';
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
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {}
  public get running(): boolean {
    return this.isRunning;
  }

  public async launch(builtinWorkspace: boolean, maxWorkspace: number, installationPath: string) {
    let port = 2090;

    if (!this.options.lsp.detach) {
      port = await getPort();
    }
    const log = this.loggerFactory.getLogger(['code', `java@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log, this.options.lsp);
    proxy.awaitServerConnection();
    if (this.options.lsp.detach) {
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
      let child = await this.spawnJava(installationPath, port, log);
      proxy.onDisconnected(async () => {
        if (!proxy.isClosed) {
          child.kill();
          proxy.awaitServerConnection();
          log.warn('language server disconnected, restarting it');
          child = await this.spawnJava(installationPath, port, log);
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
        resolve(
          new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options, {
            settings: {
              'java.import.gradle.enabled': this.options.security.enableGradleImport,
              'java.import.maven.enabled': this.options.security.enableMavenImport,
              'java.autobuild.enabled': false,
            },
          })
        );
      });
    });
  }

  private async getJavaHome(installationPath: string, log: Logger) {
    function findJDK(platform: string) {
      const JDKFound = glob.sync(`**/jdks/*${platform}/jdk-*`, {
        cwd: installationPath,
      });
      if (!JDKFound.length) {
        log.error('Cannot find Java Home in Bundle installation for ' + platform);
        return undefined;
      }
      return path.resolve(installationPath, JDKFound[0]);
    }

    let bundledJavaHome;

    // detect platform
    const osPlatform = getOsPlatform();
    switch (osPlatform) {
      case 'darwin':
        bundledJavaHome = `${findJDK('osx')}/Contents/Home`;
        break;
      case 'win32':
        bundledJavaHome = `${findJDK('windows')}`;
        break;
      case 'freebsd':
      case 'linux':
        bundledJavaHome = `${findJDK('linux')}`;
        break;
      default:
        log.error('No Bundle JDK defined ' + osPlatform);
    }

    if (this.getSystemJavaHome()) {
      const javaHomePath = this.getSystemJavaHome();
      if (await this.checkJavaVersion(javaHomePath)) {
        return javaHomePath;
      }
    }

    return bundledJavaHome;
  }

  private async spawnJava(installationPath: string, port: number, log: Logger) {
    const launchersFound = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', {
      cwd: installationPath,
    });
    if (!launchersFound.length) {
      throw new Error('Cannot find language server jar file');
    }

    const javaHomePath = await this.getJavaHome(installationPath, log);
    if (!javaHomePath) {
      throw new Error('Cannot find Java Home');
    }

    const javaPath = path.resolve(
      javaHomePath,
      'bin',
      process.platform === 'win32' ? 'java.exe' : 'java'
    );

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
        this.options.jdtConfigPath,
        '-data',
        this.options.jdtWorkspacePath,
      ],
      {
        detached: false,
        stdio: 'pipe',
        env: {
          ...process.env,
          CLIENT_HOST: '127.0.0.1',
          CLIENT_PORT: port.toString(),
          JAVA_HOME: javaHomePath,
        },
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
      `Launch Java Language Server at port ${port.toString()}, pid:${
        p.pid
      }, JAVA_HOME:${javaHomePath}`
    );
    return p;
  }

  // TODO(pcxu): run /usr/libexec/java_home to get all java homes for macOS
  private getSystemJavaHome(): string {
    let javaHome = process.env.JDK_HOME;
    if (!javaHome) {
      javaHome = process.env.JAVA_HOME;
    }
    if (javaHome) {
      javaHome = this.expandHomeDir(javaHome);
      const JAVAC_FILENAME = 'javac' + (process.platform === 'win32' ? '.exe' : '');
      if (existsSync(javaHome) && existsSync(path.resolve(javaHome, 'bin', JAVAC_FILENAME))) {
        return javaHome;
      }
    }
    return '';
  }

  private checkJavaVersion(javaHome: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      execFile(
        path.resolve(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'),
        ['-version'],
        {},
        (error, stdout, stderr) => {
          const javaVersion = this.parseMajorVersion(stderr);
          if (javaVersion < 8) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  private parseMajorVersion(content: string): number {
    let regexp = /version "(.*)"/g;
    let match = regexp.exec(content);
    if (!match) {
      return 0;
    }
    let version = match[1];
    if (version.startsWith('1.')) {
      version = version.substring(2);
    }

    regexp = /\d+/g;
    match = regexp.exec(version);
    let javaVersion = 0;
    if (match) {
      javaVersion = parseInt(match[0], 10);
    }
    return javaVersion;
  }

  private expandHomeDir(javaHome: string): string {
    const homeDir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    if (!javaHome) {
      return javaHome;
    }
    if (javaHome === '~') {
      return homeDir!;
    }
    if (javaHome.slice(0, 2) !== '~/') {
      return javaHome;
    }
    return path.join(homeDir!, javaHome.slice(2));
  }
}
