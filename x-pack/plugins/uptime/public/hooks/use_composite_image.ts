/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { composeScreenshotRef } from '../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../common/runtime_types';
import { journeyScreenshotBlockSelector } from '../state/selectors';
import {
  fetchBlocksAction,
  isPendingBlock,
  StoreScreenshotBlock,
} from '../state/reducers/synthetics';

function allBlocksLoaded(blocks: { [key: string]: StoreScreenshotBlock }, hashes: string[]) {
  for (const hash of hashes) {
    if (!blocks[hash] || isPendingBlock(blocks[hash])) {
      return false;
    }
  }
  return true;
}

/**
 * Assembles the data for a composite image and returns the composite to a callback.
 * @param imgRef the data and dimensions for the composite image.
 * @param callback sends the composited image to this callback.
 * @param url this is the composited image value, if it is truthy the function will skip the compositing process
 */
export const useCompositeImage = (
  imgRef: ScreenshotRefImageData,
  callback: React.Dispatch<string | undefined>,
  url?: string
): void => {
  const dispatch = useDispatch();
  const blocks = useSelector(journeyScreenshotBlockSelector);
  React.useEffect(() => {
    dispatch(
      fetchBlocksAction(imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash))
    );
  }, [dispatch, imgRef.ref.screenshotRef.screenshot_ref.blocks]);
  React.useEffect(() => {
    const canvas = document.createElement('canvas');

    async function compose() {
      // @ts-expect-error TODO fix typing here
      await composeScreenshotRef(imgRef, canvas, blocks);
      const imgData = canvas.toDataURL('image/jpg', 1.0);
      callback(imgData);
    }

    // if the URL is truthy it means it's already been composed, so there
    // is no need to call the function
    if (
      typeof url === 'undefined' &&
      allBlocksLoaded(
        blocks,
        imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash)
      )
    ) {
      compose();
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [imgRef, callback, url, blocks]);
};
