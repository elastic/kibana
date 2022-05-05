/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const streamFetch = async <T = unknown>(
  dispatch: React.Dispatch<T | T[]>,
  abortCtrl: React.MutableRefObject<AbortController>,
  notifications: CoreStart['notifications']
) => {
  const stream = await fetch('/internal/aiops/example_stream', {
    signal: abortCtrl.current.signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'stream',
    },
    body: JSON.stringify({ timeout: 250 }),
  });

  if (stream.body !== null) {
    const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
    const bufferBounce = 100;
    let partial = '';
    let actionBuffer: T[] = [];
    let lastCall = 0;

    while (true) {
      try {
        const { value, done } = await reader.read();
        if (done) break;

        const full = `${partial}${value}`;
        const parts = full.split('\n');
        const last = parts.pop();

        partial = last ?? '';

        const actions = parts.map((p) => JSON.parse(p));
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          dispatch(actionBuffer);
          actionBuffer = [];
          lastCall = now;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          notifications.toasts.addDanger(
            i18n.translate('xpack.aiops.streamFetch.errorMessage', {
              defaultMessage: 'An error occurred.',
            })
          );
        }
        break;
      }
    }

    if (actionBuffer.length > 0) {
      dispatch(actionBuffer);
      actionBuffer.length = 0;
    }
  }
};
