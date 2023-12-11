/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRefResult,
  isFullScreenshot,
  isScreenshotRef,
  isScreenshotImageBlob,
  RefResult,
  FullScreenshot,
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from './synthetics';

describe('synthetics runtime types', () => {
  let refResult: RefResult;
  let fullScreenshot: FullScreenshot;
  let screenshotImageBlob: ScreenshotImageBlob;
  let screenshotRef: ScreenshotRefImageData;

  beforeEach(() => {
    refResult = {
      '@timestamp': '123',
      monitor: {
        check_group: 'check-group',
      },
      screenshot_ref: {
        width: 1200,
        height: 900,
        blocks: [
          {
            hash: 'hash1',
            top: 0,
            left: 0,
            height: 120,
            width: 90,
          },
          {
            hash: 'hash2',
            top: 0,
            left: 90,
            height: 120,
            width: 90,
          },
        ],
      },
      synthetics: {
        package_version: 'v1',
        step: {
          name: 'step name',
          index: 0,
        },
        type: 'step/screenshot_ref',
      },
    };

    fullScreenshot = {
      synthetics: {
        blob: 'image data',
        blob_mime: 'image/jpeg',
        step: {
          name: 'step name',
        },
        type: 'step/screenshot',
      },
    };

    screenshotImageBlob = {
      stepName: null,
      maxSteps: 1,
      src: 'image data',
    };

    screenshotRef = {
      stepName: null,
      maxSteps: 1,
      ref: {
        screenshotRef: refResult,
      },
    };
  });

  describe('isRefResult', () => {
    it('identifies refs correctly', () => {
      expect(isRefResult(refResult)).toBe(true);
    });

    it('fails objects that do not correspond to the type', () => {
      expect(isRefResult(fullScreenshot)).toBe(false);
      expect(isRefResult(screenshotRef)).toBe(false);
      expect(isRefResult(screenshotImageBlob)).toBe(false);
    });
  });

  describe('isScreenshot', () => {
    it('identifies screenshot objects correctly', () => {
      expect(isFullScreenshot(fullScreenshot)).toBe(true);
    });

    it('fails objects that do not correspond to the type', () => {
      expect(isFullScreenshot(refResult)).toBe(false);
      expect(isFullScreenshot(screenshotRef)).toBe(false);
      expect(isFullScreenshot(screenshotImageBlob)).toBe(false);
    });
  });

  describe('isScreenshotImageBlob', () => {
    it('identifies screenshot image blob objects correctly', () => {
      expect(isScreenshotImageBlob(screenshotImageBlob)).toBe(true);
    });

    it('fails objects that do not correspond to the type', () => {
      expect(isScreenshotImageBlob(refResult)).toBe(false);
      expect(isScreenshotImageBlob(screenshotRef)).toBe(false);
      expect(isScreenshotImageBlob(fullScreenshot)).toBe(false);
    });
  });

  describe('isScreenshotRef', () => {
    it('identifies screenshot ref objects correctly', () => {
      expect(isScreenshotRef(screenshotRef)).toBe(true);
    });

    it('fails objects that do not correspond to the type', () => {
      expect(isScreenshotRef(refResult)).toBe(false);
      expect(isScreenshotRef(fullScreenshot)).toBe(false);
      expect(isScreenshotRef(screenshotImageBlob)).toBe(false);
    });
  });
});
