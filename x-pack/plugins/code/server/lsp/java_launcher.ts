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
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';
import { AbstractLauncher } from './abstract_launcher';

const JAVA_LANG_DETACH_PORT = 2090;

export class JavaLauncher extends AbstractLauncher {
  private needModuleArguments: boolean = true;
  public constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    super('java', targetHost, options, loggerFactory);
  }

  createExpander(proxy: LanguageServerProxy, builtinWorkspace: boolean, maxWorkspace: number) {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options, {
      settings: {
        'java.import.gradle.enabled': this.options.security.enableGradleImport,
        'java.import.maven.enabled': this.options.security.enableMavenImport,
        'java.autobuild.enabled': false,
      },
    });
  }

  startConnect(proxy: LanguageServerProxy) {
    proxy.awaitServerConnection().catch(this.log.debug);
  }

  async getPort(): Promise<number> {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return JAVA_LANG_DETACH_PORT;
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
      const javaVersion = await this.getJavaVersion(javaHomePath);
      if (javaVersion > 8) {
        // for JDK's versiob > 8, we need extra arguments as default
        return javaHomePath;
      } else if (javaVersion === 8) {
        // JDK's version = 8, needn't extra arguments
        this.needModuleArguments = false;
        return javaHomePath;
      } else {
        // JDK's version < 8, use bundled JDK instead, whose version > 8, so need extra arguments as default
      }
    }

    return bundledJavaHome;
  }

  async spawnProcess(installationPath: string, port: number, log: Logger) {
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

    const params: string[] = [
      '-Declipse.application=org.elastic.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Declipse.product=org.elastic.jdt.ls.core.product',
      '-Dlog.level=ALL',
      '-Dfile.encoding=utf8',
      '-noverify',
      '-Xmx4G',
      '-jar',
      path.resolve(installationPath, launchersFound[0]),
      '-configuration',
      this.options.jdtConfigPath,
      '-data',
      this.options.jdtWorkspacePath,
    ];

    if (this.needModuleArguments) {
      params.push(
        '--add-modules=ALL-SYSTEM',
        '--add-opens',
        'java.base/java.util=ALL-UNNAMED',
        '--add-opens',
        'java.base/java.lang=ALL-UNNAMED'
      );
    }

    const p = spawn(javaPath, params, {
      detached: false,
      stdio: 'pipe',
      env: {
        ...process.env,
        CLIENT_HOST: '127.0.0.1',
        CLIENT_PORT: port.toString(),
        JAVA_HOME: javaHomePath,
      },
    });
    p.stdout.on('data', data => {
      log.stdout(data.toString());
    });
    p.stderr.on('data', data => {
      log.stderr(data.toString());
    });
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

  private getJavaVersion(javaHome: string): Promise<number> {
    return new Promise((resolve, reject) => {
      execFile(
        path.resolve(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'),
        ['-version'],
        {},
        (error, stdout, stderr) => {
          const javaVersion = this.parseMajorVersion(stderr);
          resolve(javaVersion);
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
