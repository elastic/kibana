/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotRefImageData } from '../../../common/runtime_types';

export const mockRef: ScreenshotRefImageData = {
  maxSteps: 1,
  stepName: 'load homepage',
  ref: {
    screenshotRef: {
      '@timestamp': '2021-06-08T19:42:30.257Z',
      synthetics: {
        package_version: '1.0.0-beta.2',
        step: { name: 'load homepage', index: 1 },
        type: 'step/screenshot_ref',
      },
      screenshot_ref: {
        blocks: [
          {
            top: 0,
            left: 0,
            width: 160,
            hash: 'd518801fc523cf02727cd520f556c4113b3098c7',
            height: 90,
          },
          {
            top: 0,
            left: 160,
            width: 160,
            hash: 'fa90345d5d7b05b1601e9ee645e663bc358869e0',
            height: 90,
          },
        ],
        width: 1280,
        height: 720,
      },
      monitor: { check_group: 'a567cc7a-c891-11eb-bdf9-3e22fb19bf97' },
    },
    blocks: [
      {
        id: 'd518801fc523cf02727cd520f556c4113b3098c7',
        synthetics: {
          blob:
            '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',
          blob_mime: 'image/jpeg',
        },
      },
      {
        id: 'fa90345d5d7b05b1601e9ee645e663bc358869e0',
        synthetics: {
          blob:
            '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',
          blob_mime: 'image/jpeg',
        },
      },
    ],
  },
};
