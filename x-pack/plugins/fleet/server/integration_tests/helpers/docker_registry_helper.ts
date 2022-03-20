/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

import pRetry from 'p-retry';
import fetch from 'node-fetch';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DOCKER_START_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useDockerRegistry() {
  const packageRegistryPort = process.env.FLEET_PACKAGE_REGISTRY_PORT || '8081';

  if (!packageRegistryPort.match(/^[0-9]{4}/)) {
    throw new Error('Invalid FLEET_PACKAGE_REGISTRY_PORT');
  }

  let dockerProcess: ChildProcess | undefined;
  async function startDockerRegistryServer() {
    const dockerImage = `docker.elastic.co/package-registry/distribution@sha256:b3dfc6a11ff7dce82ba8689ea9eeb54e353c6b4bfd2d28127b20ef72fd8883e9`;

    const args = ['run', '--rm', '-p', `${packageRegistryPort}:8080`, dockerImage];

    dockerProcess = spawn('docker', args, { stdio: 'inherit' });

    let isExited = dockerProcess.exitCode !== null;
    dockerProcess.once('exit', () => {
      isExited = true;
    });

    const startedAt = Date.now();

    while (!isExited && Date.now() - startedAt <= DOCKER_START_TIMEOUT) {
      try {
        const res = await fetch(`http://localhost:${packageRegistryPort}/`);
        if (res.status === 200) {
          return;
        }
      } catch (err) {
        // swallow errors
      }

      await delay(3000);
    }

    if (isExited && dockerProcess.exitCode !== 0) {
      throw new Error(`Unable to setup docker registry exit code ${dockerProcess.exitCode}`);
    }

    dockerProcess.kill();
    throw new pRetry.AbortError('Unable to setup docker registry after timeout');
  }

  async function cleanupDockerRegistryServer() {
    if (dockerProcess && !dockerProcess.killed) {
      dockerProcess.kill();
    }
  }

  beforeAll(async () => {
    const testTimeout = 5 * 60 * 1000; // 5 minutes timeout
    jest.setTimeout(testTimeout);
    await pRetry(() => startDockerRegistryServer(), {
      retries: 3,
    });
  });

  afterAll(async () => {
    await cleanupDockerRegistryServer();
  });

  return `http://localhost:${packageRegistryPort}`;
}
