/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  InfraSynthtraceEsClient,
  LogsSynthtraceEsClient,
} from '@kbn/apm-synthtrace';
import { Logger } from '@kbn/apm-synthtrace/src/lib/utils/create_logger';
import { ToolingLog } from '@kbn/tooling-log';
import { isPromise } from 'util/types';

export interface SynthtraceEsClients {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  infraSynthtraceEsClient: InfraSynthtraceEsClient;
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
}

export async function setupSynthtrace({
  log,
  client,
  target,
}: {
  log: ToolingLog;
  client: Client;
  target: string;
}): Promise<SynthtraceEsClients> {
  const logger: Logger = {
    debug: (...args) => log.debug(...args),
    info: (...args) => log.info(...args),
    error: (...args) => log.error(args.map((arg) => arg.toString()).join(' ')),
    perf: (name, cb) => {
      const now = performance.now();

      const result = cb();

      function measure() {
        const after = performance.now();
        log.debug(`[${name}] took ${after - now} ms`);
      }

      if (isPromise(result)) {
        result.finally(measure);
      } else {
        measure();
      }

      return result;
    },
  };
  const kibanaClient = new ApmSynthtraceKibanaClient({
    target,
    logger,
  });

  const latestVersion = await kibanaClient.fetchLatestApmPackageVersion();

  await kibanaClient.installApmPackage(latestVersion);

  const apmSynthtraceEsClient = new ApmSynthtraceEsClient({
    logger,
    client,
    version: latestVersion,
    refreshAfterIndex: true,
  });

  const logsSynthtraceEsClient = new LogsSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
  });

  const infraSynthtraceEsClient = new InfraSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
  });

  return {
    apmSynthtraceEsClient,
    logsSynthtraceEsClient,
    infraSynthtraceEsClient,
  };
}
