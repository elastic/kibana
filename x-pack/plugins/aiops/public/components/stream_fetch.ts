/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import { ApiAction } from '../../common/api';

export const streamFetch = async (
  dispatch: React.Dispatch<ApiAction | ApiAction[]>,
  abortCtrl: React.MutableRefObject<AbortController>
) => {
  const stream = await fetch('/api/aiops/example_stream', {
    signal: abortCtrl.current.signal,
    headers: {
      'kbn-xsrf': 'stream',
    },
  });

  if (stream.body !== null) {
    const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();

    let partial = '';
    let actionBuffer: ApiAction[] = [];
    const bufferBounce = 500;
    let lastCall = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const full = `${partial}${value}`;
      const parts = full.split('\n');
      const last = parts.pop();

      partial = last ?? '';

      try {
        const actions = parts.map((p) => JSON.parse(p));
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          console.log('actions', actionBuffer);
          dispatch(actionBuffer);
          actionBuffer = [];
          lastCall = now;
        }
      } catch (e) {
        console.error('failed JSON parsing/dispatching actions', e);
      }
    }

    if (actionBuffer.length > 0) {
      console.log('last actions', actionBuffer);
      dispatch(actionBuffer);
      actionBuffer.length = 0;
    }
  }
};
