/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotRefImageData } from '../../../common/runtime_types/ping/synthetics';
import { composeScreenshotRef } from './compose_screenshot_images';

describe('composeScreenshotRef', () => {
  let getContextMock: jest.Mock;
  let drawImageMock: jest.Mock;
  let ref: ScreenshotRefImageData;
  let contextMock: unknown;

  beforeEach(() => {
    drawImageMock = jest.fn();
    contextMock = {
      drawImage: drawImageMock,
    };
    getContextMock = jest.fn().mockReturnValue(contextMock);
    ref = {
      stepName: 'step',
      maxSteps: 3,
      ref: {
        screenshotRef: {
          '@timestamp': '123',
          monitor: { check_group: 'check-group' },
          screenshot_ref: {
            blocks: [
              {
                hash: '123',
                top: 0,
                left: 0,
                width: 10,
                height: 10,
              },
            ],
            height: 100,
            width: 100,
          },
          synthetics: {
            package_version: 'v1',
            step: {
              name: 'step-name',
              index: 0,
            },
            type: 'step/screenshot_ref',
          },
        },
      },
    };
  });

  it('throws error when blob does not exist', async () => {
    try {
      // @ts-expect-error incomplete invocation for test
      await composeScreenshotRef(ref, { getContext: getContextMock }, {});
    } catch (e: any) {
      expect(e).toMatchInlineSnapshot(
        `[Error: Error processing image. Expected image data with hash 123 is missing]`
      );
      expect(getContextMock).toHaveBeenCalled();
      expect(getContextMock.mock.calls[0][0]).toBe('2d');
      expect(getContextMock.mock.calls[0][1]).toEqual({ alpha: false });
    }
  });

  it('throws error when block is pending', async () => {
    try {
      await composeScreenshotRef(
        ref,
        // @ts-expect-error incomplete invocation for test
        { getContext: getContextMock },
        { '123': { status: 'pending' } }
      );
    } catch (e: any) {
      expect(e).toMatchInlineSnapshot(
        `[Error: Error processing image. Expected image data with hash 123 is missing]`
      );
      expect(getContextMock).toHaveBeenCalled();
      expect(getContextMock.mock.calls[0][0]).toBe('2d');
      expect(getContextMock.mock.calls[0][1]).toEqual({ alpha: false });
    }
  });
});
