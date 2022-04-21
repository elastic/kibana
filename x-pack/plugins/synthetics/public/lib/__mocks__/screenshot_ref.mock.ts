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
  },
};
