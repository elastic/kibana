/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ONE_MILLION = BigInt(1000 * 1000);

export function nanosToMillis(nanos: string | number): number {
  return Number(BigInt(nanos) / ONE_MILLION);
}
