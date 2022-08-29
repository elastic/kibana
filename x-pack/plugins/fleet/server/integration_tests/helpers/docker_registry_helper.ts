/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcess } from 'child_process';

import * as Rx from 'rxjs';
import { filter, take, map, tap } from 'rxjs/operators';
import execa from 'execa';

import { observeLines } from '@kbn/stdio-dev-helpers';
import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';

const BEFORE_SETUP_TIMEOUT = 30 * 60 * 1000; // 30 minutes;

const DOCKER_START_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DOCKER_IMAGE = `docker.elastic.co/package-registry/distribution:production-v2-experimental`;

function firstWithTimeout(source$: Rx.Observable<any>, errorMsg: string, ms = 30 * 1000) {
  return Rx.race(
    source$.pipe(take(1)),
    Rx.timer(ms).pipe(
      map(() => {
        throw new Error(`[docker:${DOCKER_IMAGE}] ${errorMsg} within ${ms / 1000} seconds`);
      })
    )
  );
}

function childProcessToLogLine(childProcess: ChildProcess, log: ToolingLog) {
  const logLine$ = new Rx.Subject<string>();

  Rx.merge(
    observeLines(childProcess.stdout!).pipe(
      tap((line) => log.info(`[docker:${DOCKER_IMAGE}] ${line}`))
    ), // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
    observeLines(childProcess.stderr!).pipe(
      tap((line) => log.error(`[docker:${DOCKER_IMAGE}] ${line}`))
    ) // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null
  ).subscribe(logLine$);

  return logLine$.asObservable();
}

export function useDockerRegistry() {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const packageRegistryPort = process.env.FLEET_PACKAGE_REGISTRY_PORT || '8081';

  if (!packageRegistryPort.match(/^[0-9]{4}/)) {
    throw new Error('Invalid FLEET_PACKAGE_REGISTRY_PORT');
  }

  let dockerProcess: ChildProcess | undefined;
  async function startDockerRegistryServer() {
    const args = ['run', '--rm', '-p', `${packageRegistryPort}:8080`, DOCKER_IMAGE];

    dockerProcess = execa('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let isExited = dockerProcess.exitCode !== null;
    dockerProcess.once('exit', () => {
      isExited = true;
    });
    const waitForLogLine = /package manifests loaded/;

    try {
      await firstWithTimeout(
        childProcessToLogLine(dockerProcess, logger).pipe(
          filter((line) => {
            process.stdout.write(line);
            return waitForLogLine.test(line);
          })
        ),
        'no package manifests loaded',
        DOCKER_START_TIMEOUT
      ).toPromise();
    } catch (err) {
      dockerProcess.kill();
      throw err;
    }

    if (isExited && dockerProcess.exitCode !== 0) {
      throw new Error(`Unable to setup docker registry exit code ${dockerProcess.exitCode}`);
    }
  }

  async function pullDockerImage() {
    logger.info(`[docker:${DOCKER_IMAGE}] pulling docker image "${DOCKER_IMAGE}"`);
    await execa('docker', ['pull', DOCKER_IMAGE]);
  }

  async function cleanupDockerRegistryServer() {
    if (dockerProcess && !dockerProcess.killed) {
      dockerProcess.kill();
    }
  }

  beforeAll(async () => {
    jest.setTimeout(BEFORE_SETUP_TIMEOUT);
    await pRetry(() => pullDockerImage(), {
      retries: 3,
    });

    await pRetry(() => startDockerRegistryServer(), {
      retries: 3,
    });
  });

  afterAll(async () => {
    await cleanupDockerRegistryServer();
  });

  return `http://localhost:${packageRegistryPort}`;
}
