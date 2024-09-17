/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { contextServiceMock, executionContextServiceMock } from '@kbn/core/server/mocks';
import { createHttpService } from '@kbn/core-http-server-mocks';
import supertest from 'supertest';
import { APMEventClient } from '.';

describe('APMEventClient', () => {
  let server: ReturnType<typeof createHttpService>;

  beforeEach(() => {
    server = createHttpService();
  });

  afterEach(async () => {
    await server.stop();
  });
  it('cancels a search when a request is aborted', async () => {
    await server.preboot({
      context: contextServiceMock.createPrebootContract(),
    });
    const { server: innerServer, createRouter } = await server.setup({
      context: contextServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });
    const router = createRouter('/');

    let abortSignal: AbortSignal | undefined;
    router.get({ path: '/', validate: false }, async (context, request, res) => {
      const eventClient = new APMEventClient({
        esClient: {
          search: async (params: any, { signal }: { signal: AbortSignal }) => {
            abortSignal = signal;
            await setTimeoutPromise(3_000, undefined, {
              signal: abortSignal,
            });
            return {};
          },
        } as any,
        debug: false,
        request,
        indices: {} as any,
        options: {
          includeFrozen: false,
        },
      });

      await eventClient.search('foo', {
        apm: {
          events: [],
        },
        body: { size: 0, track_total_hits: false },
      });

      return res.ok({ body: 'ok' });
    });

    await server.start();

    expect(abortSignal?.aborted).toBeFalsy();

    const incomingRequest = supertest(innerServer.listener)
      .get('/')
      // end required to send request
      .end();

    await new Promise((resolve) => {
      setTimeout(() => {
        void incomingRequest.on('abort', () => {
          setTimeout(() => {
            resolve(undefined);
          }, 100);
        });
        void incomingRequest.abort();
      }, 100);
    });

    expect(abortSignal?.aborted).toBe(true);
  });
});
