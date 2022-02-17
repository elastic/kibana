/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createJourneyScreenshotBlocksRoute } from './journey_screenshot_blocks';

describe('journey screenshot blocks route', () => {
  let libs: unknown;
  beforeEach(() => {
    libs = {
      uptimeEsClient: jest.fn(),
      request: {
        body: {
          hashes: ['hash1', 'hash2'],
        },
      },
      response: {
        badRequest: jest.fn().mockReturnValue({ status: 400, message: 'Bad request.' }),
        ok: jest.fn((responseData) => ({ ...responseData, status: 200, message: 'Ok' })),
        notFound: jest.fn().mockReturnValue({ status: 404, message: 'Not found.' }),
      },
    };
  });

  it('returns status code 400 if hash list is invalid', async () => {
    // @ts-expect-error incomplete implementation for testing
    const route = createJourneyScreenshotBlocksRoute();

    libs = Object.assign({}, libs, { request: { body: { hashes: undefined } } });

    // @ts-expect-error incomplete implementation for testing
    const response = await route.handler(libs);
    expect(response.status).toBe(400);
  });

  it('returns status code 404 if result is empty set', async () => {
    const route = createJourneyScreenshotBlocksRoute({
      // @ts-expect-error incomplete implementation for testing
      requests: {
        getJourneyScreenshotBlocks: jest.fn().mockReturnValue([]),
      },
    });

    // @ts-expect-error incomplete implementation for testing
    expect((await route.handler(libs)).status).toBe(404);
  });

  it('returns blocks for request', async () => {
    const responseData = [
      {
        id: 'hash1',
        synthetics: {
          blob: 'blob1',
          blob_mime: 'image/jpeg',
        },
      },
      {
        id: 'hash2',
        synthetics: {
          blob: 'blob2',
          blob_mime: 'image/jpeg',
        },
      },
    ];
    const route = createJourneyScreenshotBlocksRoute({
      // @ts-expect-error incomplete implementation for testing
      requests: {
        getJourneyScreenshotBlocks: jest.fn().mockReturnValue(responseData),
      },
    });

    // @ts-expect-error incomplete implementation for testing
    const response = await route.handler(libs);
    expect(response.status).toBe(200);
    // @ts-expect-error incomplete implementation for testing
    expect(response.body).toEqual(responseData);
  });
});
