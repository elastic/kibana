/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyScreenshot } from './get_journey_screenshot';
import { mockSearchResult } from './helper';

describe('getJourneyScreenshot', () => {
  it('returns screenshot data', async () => {
    const screenshotResult = {
      _id: 'id',
      _index: 'index',
      _source: {
        synthetics: {
          blob_mime: 'image/jpeg',
          blob: 'image data',
          step: {
            name: 'load homepage',
          },
          type: 'step/screenshot',
        },
      },
    };
    expect(
      await getJourneyScreenshot({
        uptimeEsClient: mockSearchResult([], {
          step: {
            image: {
              hits: {
                total: 1,
                hits: [screenshotResult],
              },
            },
          },
        }),
        checkGroup: 'checkGroup',
        stepIndex: 0,
      })
    ).toEqual({
      synthetics: {
        blob: 'image data',
        blob_mime: 'image/jpeg',
        step: {
          name: 'load homepage',
        },
        type: 'step/screenshot',
      },
      totalSteps: 0,
    });
  });

  it('returns ref data', async () => {
    const screenshotRefResult = {
      _id: 'id',
      _index: 'index',
      _source: {
        '@timestamp': '123',
        monitor: {
          check_group: 'check_group',
        },
        screenshot_ref: {
          width: 10,
          height: 20,
          blocks: [
            {
              hash: 'hash1',
              top: 0,
              left: 0,
              height: 2,
              width: 4,
            },
            {
              hash: 'hash2',
              top: 0,
              left: 2,
              height: 2,
              width: 4,
            },
          ],
        },
        synthetics: {
          package_version: 'v1.0.0',
          step: {
            name: 'name',
            index: 0,
          },
          type: 'step/screenshot_ref',
        },
      },
    };
    expect(
      await getJourneyScreenshot({
        uptimeEsClient: mockSearchResult([], {
          step: { image: { hits: { hits: [screenshotRefResult], total: 1 } } },
        }),
        checkGroup: 'checkGroup',
        stepIndex: 0,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "123",
        "monitor": Object {
          "check_group": "check_group",
        },
        "screenshot_ref": Object {
          "blocks": Array [
            Object {
              "hash": "hash1",
              "height": 2,
              "left": 0,
              "top": 0,
              "width": 4,
            },
            Object {
              "hash": "hash2",
              "height": 2,
              "left": 2,
              "top": 0,
              "width": 4,
            },
          ],
          "height": 20,
          "width": 10,
        },
        "synthetics": Object {
          "package_version": "v1.0.0",
          "step": Object {
            "index": 0,
            "name": "name",
          },
          "type": "step/screenshot_ref",
        },
        "totalSteps": 0,
      }
    `);
  });
});
