/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contextServiceMock } from 'src/core/server/mocks';
import { createHttpServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { createApmEventClient } from '.';

describe('createApmEventClient', () => {
  let server: ReturnType<typeof createHttpServer>;

  beforeEach(() => {
    server = createHttpServer();
  });

  afterEach(async () => {
    await server.stop();
  });
  it('cancels a search when a request is aborted', async () => {
    const { server: innerServer, createRouter } = await server.setup({
      context: contextServiceMock.createSetupContract(),
    });
    const router = createRouter('/');

    const abort = jest.fn();
    router.get(
      { path: '/', validate: false },
      async (context, request, res) => {
        const eventClient = createApmEventClient({
          esClient: {
            search: () => {
              return Object.assign(
                new Promise((resolve) => setTimeout(resolve, 3000)),
                { abort }
              );
            },
          } as any,
          debug: false,
          request,
          indices: {} as any,
          options: {
            includeFrozen: false,
          },
        });

        await eventClient.search({
          apm: {
            events: [],
          },
        });

        return res.ok({ body: 'ok' });
      }
    );

    await server.start();

    const incomingRequest = supertest(innerServer.listener)
      .get('/')
      // end required to send request
      .end();

    await new Promise((resolve) => {
      setTimeout(() => {
        incomingRequest.on('abort', () => {
          setTimeout(() => {
            resolve(undefined);
          }, 0);
        });
        incomingRequest.abort();
      }, 50);
    });

    expect(abort).toHaveBeenCalled();
  });
});
