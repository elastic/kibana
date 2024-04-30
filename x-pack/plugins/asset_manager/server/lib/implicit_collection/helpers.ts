/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transaction } from 'elastic-apm-node';
type CollectorSpan = 'processing_response' | 'read' | 'write';

interface SpanOptions {
  name: CollectorSpan;
  transaction?: Transaction | null;
}

export async function withSpan<T>(options: SpanOptions, fn: () => Promise<T>) {
  const span = options.transaction?.startSpan(options.name);
  const result = await fn();
  span?.end();
  return result;
}
