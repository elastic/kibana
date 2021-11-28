/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import {
  createLogger,
  LogLevel,
  SynthtraceEsClient,
} from '@elastic/apm-synthtrace';
// @ts-ignore
import generateSimpleTrace from '../../../../../packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace';

export async function generateTraceData({
  serviceName,
  environment,
  start,
  end,
  esUrl,
  clean,
}: {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  esUrl: string;
  clean: boolean;
}) {
  const esClient = new Client({ node: esUrl, Connection: HttpConnection });

  const synthtraceEsClient = new SynthtraceEsClient(
    esClient,
    createLogger(LogLevel.info)
  );

  const traceEvents = generateSimpleTrace({
    from: new Date(start).getTime(),
    to: new Date(end).getTime(),
    serviceName,
    environment,
  });

  if (clean) {
    await synthtraceEsClient.clean();
  }

  await synthtraceEsClient.index(traceEvents);
  return traceEvents;
}
