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
}: {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  esUrl: string;
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

  await synthtraceEsClient.clean();
  await synthtraceEsClient.index(traceEvents);
  console.log('Trace data generated');
  return traceEvents;
}
