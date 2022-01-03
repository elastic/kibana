/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function collectStream(stream: Iterable<Buffer>): Promise<Buffer> {
  const payload = [];
  for await (const chunk of stream) {
    payload.push(chunk);
  }
  return Buffer.concat(payload);
}

export function isAbortError(error: Error) {
  return error.name === 'RequestAbortedError';
}
