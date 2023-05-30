/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transaction } from 'elastic-apm-node';

type CollectorSpan = 'processing_response';

interface SpanOptions {
  name: CollectorSpan;
  transaction: Transaction | null;
}

export function withSpan<T>(options: SpanOptions, fn: () => T) {
  const span = options.transaction?.startSpan(options.name);
  const result = fn();
  span?.end();
  return result;
}
