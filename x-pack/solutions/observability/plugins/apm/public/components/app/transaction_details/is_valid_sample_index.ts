/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true when `sampleIndex` points at an existing position in
 * `traceSamples`, so samples sharing the same traceId/transactionId (e.g.
 * paired `gen_ai.*` documents) can be selected by array position instead of by
 * identifier, which would collapse such pairs onto the first match.
 */
export function isValidSampleIndex(
  sampleIndex: number | undefined,
  traceSamples: unknown[] | undefined
): sampleIndex is number {
  return (
    sampleIndex !== undefined &&
    !!traceSamples &&
    sampleIndex >= 0 &&
    sampleIndex < traceSamples.length
  );
}
