/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyScreenshotBlocks } from './get_journey_screenshot_blocks';
import { mockSearchResult } from './helper';

describe('getJourneyScreenshotBlocks', () => {
  it('returns formatted blocks', async () => {
    expect(
      await getJourneyScreenshotBlocks({
        uptimeEsClient: mockSearchResult([
          {
            _id: 'hash1',
            _source: {
              synthetics: {
                blob: 'image data',
                blob_mime: 'image/jpeg',
              },
            },
          },
          {
            _id: 'hash2',
            _source: {
              synthetics: {
                blob: 'image data',
                blob_mime: 'image/jpeg',
              },
            },
          },
        ]),
        blockIds: ['hash1', 'hash2'],
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "hash1",
          "synthetics": Object {
            "blob": "image data",
            "blob_mime": "image/jpeg",
          },
        },
        Object {
          "id": "hash2",
          "synthetics": Object {
            "blob": "image data",
            "blob_mime": "image/jpeg",
          },
        },
      ]
    `);
  });

  it('throws error for malformed data', async () => {
    let exception: unknown;
    try {
      await getJourneyScreenshotBlocks({
        uptimeEsClient: mockSearchResult([
          {
            _id: 'hash1',
            _source: {
              foo: 'bar',
            },
          },
          {
            _id: 'hash2',
            _source: {
              foo: 'bar',
            },
          },
        ]),
        blockIds: ['hash1', 'hash2'],
      });
    } catch (e: unknown) {
      exception = e;
    } finally {
      expect(exception).toBeDefined();
      expect(exception).toMatchInlineSnapshot(
        `[Error: Error parsing journey screenshot blocks. Malformed data.]`
      );
    }
  });
});
