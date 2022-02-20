/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  apm,
  createLogger,
  LogLevel,
  ApmSynthtraceEsClient,
} from '@elastic/apm-synthtrace';
import { createEsClientForTesting } from '@kbn/test';

let synthtraceEsClient: ApmSynthtraceEsClient;

export function setSynthtraceEsClient({
  esUrl,
  requestTimeout,
  isCloud,
}: {
  esUrl: string;
  requestTimeout: number | undefined;
  isCloud: boolean | undefined;
}) {
  const client = createEsClientForTesting({
    esUrl,
    requestTimeout,
    isCloud,
  });

  synthtraceEsClient = new apm.ApmSynthtraceEsClient(
    client,
    createLogger(LogLevel.info)
  );
}

export async function synthtraceIndex(events: any) {
  await synthtraceEsClient.index(events);
}

export async function synthtraceClean() {
  await synthtraceEsClient.clean();
}
