/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, LogLevelId } from '@kbn/logging';
import { type MessagePort } from 'worker_threads';
import agent from 'elastic-apm-node';
import { getFlameGraph, type FlameGraphResponse } from '../server/routes/get_flamegraph';
import type { WorkerFlameGraphOptions } from '../server/types';
import { createProfilingEsClientInWorkerThread } from '../server/utils/create_profiling_es_client';

function createLogMethod(port: MessagePort, logLevel: LogLevelId) {
  return (...rest: any[]) => port.postMessage({ level: logLevel, args: rest });
}

function createLogger(port: MessagePort): Logger {
  return {
    debug: createLogMethod(port, 'debug'),
    error: createLogMethod(port, 'error'),
    trace: createLogMethod(port, 'trace'),
    fatal: createLogMethod(port, 'fatal'),
    get: (...context: string[]) => {
      return createLogger(port);
    },
    info: createLogMethod(port, 'info'),
    log: (record) => {},
    warn: createLogMethod(port, 'warn'),
  };
}

export function initialize() {
  return {
    getFlameGraph: (options: WorkerFlameGraphOptions): Promise<FlameGraphResponse> => {
      const { timeFrom, timeTo, kuery, hosts, username, password, port, childOf } = options;
      const span = agent.startTransaction('get_flamegraph_in_worker', 'worker', { childOf });

      const logger = createLogger(port);

      const profilingEsClient = createProfilingEsClientInWorkerThread({
        username,
        password,
        hosts,
        signal: new AbortController().signal,
      });

      return getFlameGraph({
        client: profilingEsClient,
        kuery,
        timeFrom,
        timeTo,
        logger,
      }).then(
        (response) => {
          span?.setOutcome('success');
          span?.end();
          return response;
        },
        (err) => {
          span?.setOutcome('failure');
          span?.end();
          throw err;
        }
      );
    },
  };
}
