/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as redux from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';
import { ScreenshotRefImageData } from '../../common/runtime_types';
import { ScreenshotBlockCache } from '../state/reducers/synthetics';
import { shouldCompose, useCompositeImage } from './use_composite_image';
import * as compose from '../lib/helper/compose_screenshot_images';

const MIME = 'image/jpeg';

describe('use composite image', () => {
  let imageData: string | undefined;
  let imgRef: ScreenshotRefImageData;
  let curRef: ScreenshotRefImageData;
  let blocks: ScreenshotBlockCache;

  beforeEach(() => {
    imgRef = {
      stepName: 'step-1',
      maxSteps: 3,
      ref: {
        screenshotRef: {
          '@timestamp': '123',
          monitor: {
            check_group: 'check-group',
          },
          screenshot_ref: {
            width: 100,
            height: 200,
            blocks: [
              {
                hash: 'hash1',
                top: 0,
                left: 0,
                width: 10,
                height: 10,
              },
              {
                hash: 'hash2',
                top: 0,
                left: 10,
                width: 10,
                height: 10,
              },
            ],
          },
          synthetics: {
            package_version: 'v1',
            step: { index: 0, name: 'first' },
            type: 'step/screenshot_ref',
          },
        },
      },
    };
    curRef = {
      stepName: 'step-1',
      maxSteps: 3,
      ref: {
        screenshotRef: {
          '@timestamp': '234',
          monitor: {
            check_group: 'check-group-2',
          },
          screenshot_ref: {
            width: 100,
            height: 200,
            blocks: [
              {
                hash: 'hash1',
                top: 0,
                left: 0,
                width: 10,
                height: 10,
              },
              {
                hash: 'hash2',
                top: 0,
                left: 10,
                width: 10,
                height: 10,
              },
            ],
          },
          synthetics: {
            package_version: 'v1',
            step: { index: 1, name: 'second' },
            type: 'step/screenshot_ref',
          },
        },
      },
    };
    blocks = {
      hash1: {
        id: 'id1',
        synthetics: {
          blob: 'blob',
          blob_mime: MIME,
        },
      },
      hash2: {
        id: 'id2',
        synthetics: {
          blob: 'blob',
          blob_mime: MIME,
        },
      },
    };
  });

  describe('shouldCompose', () => {
    it('returns true if all blocks are loaded and ref is new', () => {
      expect(shouldCompose(imageData, imgRef, curRef, blocks)).toBe(true);
    });

    it('returns false if a required block is pending', () => {
      blocks.hash2 = { status: 'pending' };
      expect(shouldCompose(imageData, imgRef, curRef, blocks)).toBe(false);
    });

    it('returns false if a required block is missing', () => {
      delete blocks.hash2;
      expect(shouldCompose(imageData, imgRef, curRef, blocks)).toBe(false);
    });

    it('returns false if imageData is defined and the refs have matching step index/check_group', () => {
      imageData = 'blob';
      curRef.ref.screenshotRef.synthetics.step.index = 0;
      curRef.ref.screenshotRef.monitor.check_group = 'check-group';
      expect(shouldCompose(imageData, imgRef, curRef, blocks)).toBe(false);
    });

    it('returns true if imageData is defined and the refs have different step names', () => {
      imageData = 'blob';
      curRef.ref.screenshotRef.synthetics.step.index = 0;
      expect(shouldCompose(imageData, imgRef, curRef, blocks)).toBe(true);
    });
  });

  describe('useCompositeImage', () => {
    let useDispatchMock: jest.Mock;
    let canvasMock: unknown;
    let removeChildSpy: jest.Mock;
    let selectorSpy: jest.SpyInstance;
    let composeSpy: jest.SpyInstance;

    beforeEach(() => {
      useDispatchMock = jest.fn();
      removeChildSpy = jest.fn();
      canvasMock = {
        parentElement: {
          removeChild: removeChildSpy,
        },
        toDataURL: jest.fn().mockReturnValue('compose success'),
      };
      // @ts-expect-error mocking canvas element for testing
      jest.spyOn(document, 'createElement').mockReturnValue(canvasMock);
      jest.spyOn(redux, 'useDispatch').mockReturnValue(useDispatchMock);
      selectorSpy = jest.spyOn(redux, 'useSelector').mockReturnValue({ blocks });
      composeSpy = jest
        .spyOn(compose, 'composeScreenshotRef')
        .mockReturnValue(new Promise((r) => r([])));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('does not compose if all blocks are not loaded', () => {
      blocks = {};
      renderHook(() => useCompositeImage(imgRef, jest.fn(), imageData));

      expect(useDispatchMock).toHaveBeenCalledWith({
        payload: ['hash1', 'hash2'],
        type: 'FETCH_BLOCKS',
      });
    });

    it('composes when all required blocks are loaded', async () => {
      const onComposeImageSuccess = jest.fn();
      const { waitFor } = renderHook(() => useCompositeImage(imgRef, onComposeImageSuccess));

      expect(selectorSpy).toHaveBeenCalled();
      expect(composeSpy).toHaveBeenCalledTimes(1);
      expect(composeSpy.mock.calls[0][0]).toEqual(imgRef);
      expect(composeSpy.mock.calls[0][1]).toBe(canvasMock);
      expect(composeSpy.mock.calls[0][2]).toBe(blocks);

      await waitFor(
        () => {
          expect(onComposeImageSuccess).toHaveBeenCalledTimes(1);
          expect(onComposeImageSuccess).toHaveBeenCalledWith('compose success');
        },
        { timeout: 10000 }
      );
    });
  });
});
