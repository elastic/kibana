/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createParser } from 'eventsource-parser';
import { partition } from 'lodash';
import { merge, of, throwError } from 'rxjs';
import type { InferenceTaskEvent } from '@kbn/inference-common';
import { observableIntoEventSourceStream } from './observable_into_event_source_stream';
import type { Logger } from '@kbn/logging';

describe('observableIntoEventSourceStream', () => {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
  function renderStream<T extends InferenceTaskEvent>(events: Array<T | Error>) {
    const [inferenceEvents, errors] = partition(
      events,
      (event): event is T => !(event instanceof Error)
    );

    const source$ = merge(of(...inferenceEvents), ...errors.map((error) => throwError(error)));

    const stream = observableIntoEventSourceStream(source$, logger);

    return new Promise<string[]>((resolve, reject) => {
      const chunks: string[] = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });
      stream.on('error', (error) => {
        reject(error);
      });
      stream.on('end', () => {
        resolve(chunks);
      });
    });
  }

  it('serializes error events', async () => {
    const chunks = await renderStream([
      {
        type: 'chunk',
      },
      new Error('foo'),
    ]);

    expect(chunks.map((chunk) => chunk.trim())).toEqual([
      `data: ${JSON.stringify({ type: 'chunk' })}`,
      `data: ${JSON.stringify({
        type: 'error',
        error: { code: 'internalError', message: 'foo' },
      })}`,
    ]);
  });

  it('outputs data in SSE-compatible format', async () => {
    const chunks = await renderStream([
      {
        type: 'chunk',
        id: 0,
      },
      {
        type: 'chunk',
        id: 1,
      },
    ]);

    const events: Array<Record<string, any>> = [];

    const parser = createParser((event) => {
      if (event.type === 'event') {
        events.push(JSON.parse(event.data));
      }
    });

    chunks.forEach((chunk) => {
      parser.feed(chunk);
    });

    expect(events).toEqual([
      {
        type: 'chunk',
        id: 0,
      },
      {
        type: 'chunk',
        id: 1,
      },
    ]);
  });
});
