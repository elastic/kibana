/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import {
  aiopsExampleStreamSchema,
  updateProgressAction,
  addToEntityAction,
  deleteEntityAction,
} from '../../common/api/example_stream';
import { API_ENDPOINT } from '../../common/api';

import { streamFactory } from '../lib/stream_factory';

export const defineExampleStreamRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: API_ENDPOINT.EXAMPLE_STREAM,
      validate: {
        body: aiopsExampleStreamSchema,
      },
    },
    async (context, request, response) => {
      const maxTimeoutMs = request.body.timeout ?? 250;
      const simulateError = request.body.simulateErrors ?? false;

      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        shouldStop = true;
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
      });

      const { DELIMITER, end, push, responseWithHeaders, stream } = streamFactory<
        typeof API_ENDPOINT.EXAMPLE_STREAM
      >(logger, request.headers);

      const entities = [
        'kimchy',
        's1monw',
        'martijnvg',
        'jasontedor',
        'nik9000',
        'javanna',
        'rjernst',
        'jrodewig',
      ];

      const actions = [...Array(19).fill('add'), 'delete'];

      if (simulateError) {
        actions.push('server-only-error');
        actions.push('server-to-client-error');
        actions.push('client-error');
      }

      let progress = 0;

      async function pushStreamUpdate() {
        setTimeout(() => {
          try {
            progress++;

            if (progress > 100 || shouldStop) {
              end();
              return;
            }

            push(updateProgressAction(progress));

            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            if (randomAction === 'add') {
              const randomCommits = Math.floor(Math.random() * 100);
              push(addToEntityAction(randomEntity, randomCommits));
            } else if (randomAction === 'delete') {
              push(deleteEntityAction(randomEntity));
            } else if (randomAction === 'server-to-client-error') {
              // Throw an error. It should not crash Kibana!
              throw new Error('There was a (simulated) server side error!');
            } else if (randomAction === 'client-error') {
              // Return not properly encoded JSON to the client.
              stream.push(`{body:'Not valid JSON${DELIMITER}`);
            }

            pushStreamUpdate();
          } catch (error) {
            stream.push(
              `${JSON.stringify({ type: 'error', payload: error.toString() })}${DELIMITER}`
            );
            end();
          }
        }, Math.floor(Math.random() * maxTimeoutMs));
      }

      // do not call this using `await` so it will run asynchronously while we return the stream already.
      pushStreamUpdate();

      return response.ok(responseWithHeaders);
    }
  );
};
