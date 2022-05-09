/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import type { ApiEndpoint, ApiEndpointOptions } from '../../common/api';

export async function* streamFetch<A = unknown, E = ApiEndpoint>(
  endpoint: E,
  abortCtrl: React.MutableRefObject<AbortController>,
  options: ApiEndpointOptions[ApiEndpoint]
) {
  const stream = await fetch(endpoint as unknown as string, {
    signal: abortCtrl.current.signal,
    method: 'POST',
    headers: {
      // This refers to the format of the request body,
      // not the response, which will be a uint8array Buffer.
      'Content-Type': 'application/json',
      'kbn-xsrf': 'stream',
    },
    body: JSON.stringify(options),
  });

  if (stream.body !== null) {
    // Note that Firefox 99 doesn't support `TextDecoderStream` yet.
    // That's why we skip it here and use `TextDecoder` later to decode each chunk.
    // Once Firefox supports it, we can use the following alternative:
    // const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
    const reader = stream.body.getReader();

    const bufferBounce = 100;
    let partial = '';
    let actionBuffer: A[] = [];
    let lastCall = 0;

    while (true) {
      try {
        const { value: uint8array, done } = await reader.read();
        if (done) break;

        const value = new TextDecoder().decode(uint8array);

        const full = `${partial}${value}`;
        const parts = full.split('\n');
        const last = parts.pop();

        partial = last ?? '';

        const actions = parts.map((p) => JSON.parse(p));
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          yield actionBuffer;
          actionBuffer = [];
          lastCall = now;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          yield { type: 'error', payload: error.toString() };
        }
        break;
      }
    }

    if (actionBuffer.length > 0) {
      yield actionBuffer;
      actionBuffer.length = 0;
    }
  }
}
