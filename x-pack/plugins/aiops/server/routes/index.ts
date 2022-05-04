/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { IRouter } from '@kbn/core/server';

import type { ApiAction } from '../../common/api';
import { updateProgressAction, addToEntityAction, deleteEntityAction } from '../../common/api';

class ResponseStream extends Readable {
  _read(): void {}
}

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/aiops/example',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );

  router.get(
    {
      path: '/api/aiops/example_stream',
      validate: false,
    },
    async (context, request, response) => {
      let shouldStop = false;

      request.events.aborted$.subscribe(() => {
        shouldStop = true;
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
      });

      const stream = new ResponseStream();

      function streamPush(d: ApiAction) {
        stream.push(JSON.stringify(d) + '\n');
      }

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

      async function runStream() {
        let progress = 0;

        function pushStreamUpdate() {
          if (shouldStop) {
            stream.push(null);
            return;
          }

          setTimeout(() => {
            progress++;

            streamPush(updateProgressAction(progress));

            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            if (randomAction === 'add') {
              streamPush(addToEntityAction(randomEntity, Math.floor(Math.random() * 100)));
            } else if (randomAction === 'delete') {
              streamPush(deleteEntityAction(randomEntity));
            }

            if (progress === 100) {
              stream.push(null);
              return;
            }

            pushStreamUpdate();
          }, Math.floor(Math.random() * 250));
        }

        pushStreamUpdate();
      }

      // do call this using `await` so it will run asynchronously while we return the stream already.
      runStream();

      return response.ok({
        body: stream,
      });
    }
  );
}
