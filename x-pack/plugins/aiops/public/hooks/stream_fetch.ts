/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import type { ApiEndpoint, ApiEndpointActions, ApiEndpointOptions } from '../../common/api';

interface ErrorAction {
  type: 'error';
  payload: string;
}

export async function* streamFetch<E extends ApiEndpoint>(
  endpoint: E,
  abortCtrl: React.MutableRefObject<AbortController>,
  options: ApiEndpointOptions[E],
  basePath = ''
): AsyncGenerator<Array<ApiEndpointActions[E] | ErrorAction>> {
  const stream = await fetch(`${basePath}${endpoint}`, {
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
    let actionBuffer: Array<ApiEndpointActions[E]> = [];
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

        const actions = parts.map((p) => JSON.parse(p)) as Array<ApiEndpointActions[E]>;
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          yield actionBuffer;
          actionBuffer = [];
          lastCall = now;

          // In cases where the next chunk takes longer to be received than the `bufferBounce` timeout,
          // we trigger this client side timeout to clear a potential intermediate buffer state.
          // Since `yield` cannot be passed on to other scopes like callbacks,
          // this pattern using a Promise is used to wait for the timeout.
          yield new Promise<Array<ApiEndpointActions[E]>>((resolve) => {
            setTimeout(() => {
              if (actionBuffer.length > 0) {
                resolve(actionBuffer);
                actionBuffer = [];
                lastCall = now;
              } else {
                resolve([]);
              }
            }, bufferBounce + 10);
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          yield [{ type: 'error', payload: error.toString() }];
        }
        break;
      }
    }

    // The reader might finish with a partially filled actionBuffer so
    // we need to clear it once more after the request is done.
    if (actionBuffer.length > 0) {
      yield actionBuffer;
      actionBuffer.length = 0;
    }
  }
}
