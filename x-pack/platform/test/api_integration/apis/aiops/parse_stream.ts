/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function* parseStream(
  stream: NodeJS.ReadableStream,
  callback?: (chunkCounter: number) => void
) {
  let partial = '';
  let chunkCounter = 0;

  try {
    for await (const value of stream) {
      chunkCounter++;
      const full = `${partial}${value}`;
      const parts = full.split('\n');
      const last = parts.pop();

      partial = last ?? '';

      const actions = parts.map((p) => JSON.parse(p));

      for (const action of actions) {
        yield action;
      }
    }
  } catch (error) {
    yield { type: 'error', payload: error.toString() };
  }

  if (typeof callback === 'function') {
    callback(chunkCounter);
  }
}
